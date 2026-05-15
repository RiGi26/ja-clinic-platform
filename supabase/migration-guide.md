# Migration Guide — Pindah ke Supabase Pro Account

## Kapan perlu migrasi?
Ketika akun Japan Arena Corp sudah upgrade ke Pro dan ingin
menyatukan semua project klinik ke satu organisasi.

## Cara Migrasi

### Step 1 — Export dari project lama
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Export schema + data
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-owner --no-acl \
  -f clinic_backup.sql
```

### Step 2 — Buat project baru di akun Pro
1. Login ke supabase.com dengan akun Japan Arena Corp
2. New Project → isi nama, region, password
3. Catat URL + anon key + service role key baru

### Step 3 — Import ke project baru
```bash
psql "postgresql://postgres:[password-baru]@[host-baru]:5432/postgres" \
  -f clinic_backup.sql
```

### Step 4 — Update env vars di Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-baru].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-baru]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key-baru]
```

### Step 5 — Redeploy
Push empty commit atau trigger manual deploy di Vercel.
Data tetap utuh karena PostgreSQL adalah PostgreSQL.

## Notes
- Supabase Auth users TIDAK ikut di pg_dump biasa
- Untuk migrate auth users, gunakan Supabase Dashboard:
  Authentication → Users → Export
  Atau gunakan Supabase Management API
- Pastikan RLS policies di-recreate (sudah ada di schema.sql)
