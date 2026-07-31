# Test Credentials

## THCO Executive Portal

### Super Admin (use for all admin/role-based testing)
- Email: `joshua@thcohq.com`
- Password: `THCOAdmin2024!`
- Role: `super_admin` (also has is_hr, is_fulfillment flags)

### Secondary Admin
- Email: `adoption@thcohqs.com`
- Password: `THCOAdmin2024!`

### Fulfillment Team (created Feb 2026)
All passwords: `THCOAdmin2024!` — `is_fulfillment=true`, can create projects.
- `adeyosola@thcohqs.com` — Adeyosola Ademola
- `christiana@thcohqs.com` — Christiana Olatunji
- `florence@thcohqs.com` — Florence Adebimpe Ojo
- `kehinde@thcohqs.com` — Kehinde Alawode

### Engineer
- `kehinde.adeleke@thcohqs.com` — Kehinde Adeleke (`is_engineer=true`)

### HR
- `hr@thcohqs.com` — HR Thco (`is_hr=true`)

## Login API
```
POST /api/auth/login
Content-Type: application/json
{"email":"joshua@thcohq.com","password":"THCOAdmin2024!"}
```
Response field for the bearer token: `session_token` (NOT `token`).
Frontend stores as `localStorage.session_token`.
