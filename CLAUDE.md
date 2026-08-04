@AGENTS.md

## Standar UI mobile (lintas-app)

Tiap fitur/halaman user-facing WAJIB ikut kontrak mobile payung — invoke skill `/mobile-ui`
sebelum menulis kode; kalau skill tak tersedia (sesi dibuka langsung di repo ini), baca
`../.claude/commands/mobile-ui.md`. Inti: desain dari 390px; body >=14px, input >=16px;
target tap >=44px; tabel -> kartu; elemen melayang tak menutupi kontrol + safe-area.
Bukti UAT wajib menyertakan screenshot viewport 390x844.
