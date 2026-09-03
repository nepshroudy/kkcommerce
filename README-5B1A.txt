KKCOMMERCE — PHASE 5B1A
Backend: Admin Orders by Date
================================

WHAT THIS PACK DOES
- Adds GET /api/admin/orders?date=YYYY-MM-DD
- If date is omitted, it defaults to today's date in Europe/London.
- Uses UK calendar-day boundaries correctly across GMT/BST changes.
- Keeps /api/admin/orders/:id and the rest of commerce.mjs unchanged.
- ADMIN/SUPERADMIN authentication remains required.

IMPORTANT
This pack intentionally DOES NOT replace commerce.mjs.
Your local backend has newer Phase 5 work, so replacing the whole file with an
older copy could remove newer routes.

INSTALL
1. Extract this ZIP directly into:
   C:\Projects\kkcommerce

2. You should then have:
   C:\Projects\kkcommerce\backend\src\worker\routes\admin-orders-by-date.mjs
   C:\Projects\kkcommerce\apply-5b1a-router.ps1

3. Open PowerShell in:
   C:\Projects\kkcommerce

4. Run:
   powershell -ExecutionPolicy Bypass -File .\apply-5b1a-router.ps1

   The script:
   - makes router.mjs.5b1a.bak
   - adds the route import
   - intercepts GET /api/admin/orders before commerce.mjs
   - will not patch twice

5. Dry-run:
   cd C:\Projects\kkcommerce\backend
   npx wrangler deploy --dry-run

6. If clean, deploy:
   npx wrangler deploy

TEST
Use an authenticated ADMIN/SUPERADMIN browser session, or test from the admin UI
after installing Phase 5B1.

The API behavior is:
   GET /api/admin/orders
       -> today's UK orders

   GET /api/admin/orders?date=2026-09-03
       -> only orders placed on 03 September 2026 UK time

ROLLBACK
A backup is created beside router.mjs:
   backend\src\worker\router.mjs.5b1a.bak

The new route file can simply be removed after restoring that backup.
