-- 007 — Atomic medicine-stock mutators. These replace read-then-write JS loops
-- in the API routes that suffered a lost-update race on medicines.stock. Each
-- locks the affected medicine rows with SELECT … FOR UPDATE so concurrent calls
-- serialize and re-read fresh stock after acquiring the lock (READ COMMITTED).

-- ── 1) Atomic dispensing ────────────────────────────────────────────────────
-- Locks the prescription + every distinct medicine, validates stock, decrements,
-- writes the ledger, and flips status to 'dispensed' — all in one transaction.
-- Quantities are aggregated per medicine to stay correct even if a prescription
-- lists the same medicine twice.
CREATE OR REPLACE FUNCTION public.dispense_prescription(
  p_prescription_id uuid,
  p_clinic_id       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status     text;
  v_patient_id uuid;
  v_item       record;
  v_stock      integer;
  v_name       text;
  v_short      jsonb := '[]'::jsonb;
BEGIN
  -- Lock the prescription; must be a confirmed System-B prescription in this clinic
  SELECT status, patient_id INTO v_status, v_patient_id
  FROM prescriptions
  WHERE id = p_prescription_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND OR v_status IS DISTINCT FROM 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- Pass 1: lock each distinct medicine, collect shortages
  FOR v_item IN
    SELECT medicine_id, SUM(quantity)::int AS qty
    FROM prescription_items
    WHERE prescription_id = p_prescription_id
    GROUP BY medicine_id
  LOOP
    SELECT stock, name INTO v_stock, v_name
    FROM medicines
    WHERE id = v_item.medicine_id AND clinic_id = p_clinic_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_short := v_short || jsonb_build_object('name', '(obat tak ditemukan)', 'stock', 0, 'needed', v_item.qty);
    ELSIF v_stock < v_item.qty THEN
      v_short := v_short || jsonb_build_object('name', v_name, 'stock', v_stock, 'needed', v_item.qty);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_short) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'insufficient', 'items', v_short);
  END IF;

  -- Pass 2: decrement + ledger (rows already locked above, values unchanged)
  FOR v_item IN
    SELECT medicine_id, SUM(quantity)::int AS qty
    FROM prescription_items
    WHERE prescription_id = p_prescription_id
    GROUP BY medicine_id
  LOOP
    SELECT stock INTO v_stock
    FROM medicines
    WHERE id = v_item.medicine_id AND clinic_id = p_clinic_id
    FOR UPDATE;

    UPDATE medicines
      SET stock = v_stock - v_item.qty
      WHERE id = v_item.medicine_id AND clinic_id = p_clinic_id;

    INSERT INTO medicine_transactions
      (clinic_id, medicine_id, type, quantity, stock_before, stock_after, notes)
    VALUES
      (p_clinic_id, v_item.medicine_id, 'keluar', v_item.qty,
       v_stock, v_stock - v_item.qty,
       'Resep ' || right(p_prescription_id::text, 8));
  END LOOP;

  UPDATE prescriptions SET status = 'dispensed' WHERE id = p_prescription_id;

  RETURN jsonb_build_object('ok', true, 'patient_id', v_patient_id);
END;
$$;

-- ── 2) Atomic manual stock adjustment ───────────────────────────────────────
-- masuk = add, keluar = subtract, adjustment = set absolute. Locks the row,
-- guards against negative stock, writes medicines + ledger atomically.
CREATE OR REPLACE FUNCTION public.adjust_medicine_stock(
  p_medicine_id uuid,
  p_clinic_id   uuid,
  p_type        text,
  p_quantity    integer,
  p_reference   text DEFAULT NULL,
  p_notes       text DEFAULT NULL,
  p_created_by  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_before integer;
  v_after  integer;
BEGIN
  IF p_type NOT IN ('masuk','keluar','adjustment') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_type');
  END IF;

  SELECT stock INTO v_before
  FROM medicines
  WHERE id = p_medicine_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  v_after := CASE p_type
    WHEN 'masuk'  THEN v_before + p_quantity
    WHEN 'keluar' THEN v_before - p_quantity
    ELSE p_quantity
  END;

  IF v_after < 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'insufficient', 'stock', v_before);
  END IF;

  UPDATE medicines SET stock = v_after
  WHERE id = p_medicine_id AND clinic_id = p_clinic_id;

  INSERT INTO medicine_transactions
    (clinic_id, medicine_id, type, quantity, stock_before, stock_after, reference, notes, created_by)
  VALUES
    (p_clinic_id, p_medicine_id, p_type, p_quantity, v_before, v_after, p_reference, p_notes, p_created_by);

  RETURN jsonb_build_object('ok', true, 'stock', v_after);
END;
$$;

-- Least privilege: only the service_role (used by the server-side admin client)
-- may call these stock mutators directly.
REVOKE ALL ON FUNCTION public.dispense_prescription(uuid, uuid)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_medicine_stock(uuid, uuid, text, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_prescription(uuid, uuid)            TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_medicine_stock(uuid, uuid, text, integer, text, text, uuid) TO service_role;
