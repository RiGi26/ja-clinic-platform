export const tenantConfig = {
  name:        process.env.TENANT_NAME     ?? 'Klinik Platform',
  tagline:     process.env.TENANT_TAGLINE  ?? 'Sistem Manajemen Klinik Modern',
  logoUrl:     process.env.TENANT_LOGO_URL ?? '/images/logo.png',
  adminPhone:  process.env.ADMIN_PHONE     ?? '6281234567890',
  address:     process.env.CLINIC_ADDRESS  ?? 'Jakarta, Indonesia',
}
