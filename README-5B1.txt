KKCOMMERCE — PHASE 5B1 COMPLETE
Admin Orders: Today + Calendar Date Filter
==========================================

INCLUDES
5B1A BACKEND
- GET /api/admin/orders?date=YYYY-MM-DD
- no date = today's date in Europe/London
- correct GMT/BST boundaries
- ADMIN/SUPERADMIN protected

5B1 FRONTEND
- Admin Orders opens on today's orders
- date/calendar picker
- Today button
- selected-day heading
- order count
- order time shown in Europe/London
- empty-day state
- existing order detail links preserved
- luxury light styling

INSTALL
1. Extract this ZIP directly into:
   C:\Projects\kkcommerce

2. Allow Windows to replace:
   frontend\src\app\admin\orders\page.tsx

   This pack adds:
   frontend\src\app\admin\orders\orders-date.css
   backend\src\worker\routes\admin-orders-by-date.mjs

   It DOES NOT overwrite backend\src\worker\router.mjs.

3. Patch router safely:
   cd C:\Projects\kkcommerce
   powershell -ExecutionPolicy Bypass -File .\apply-5b1a-router.ps1

BACKEND CHECK
   cd C:\Projects\kkcommerce\backend
   npx wrangler deploy --dry-run

If clean:
   npx wrangler deploy

FRONTEND CHECK
   cd C:\Projects\kkcommerce\frontend
   npm run build

Expected route remains:
   /admin/orders

DEPLOY FRONTEND
Before deploying, confirm frontend\wrangler.jsonc still contains ONLY:
- shop.kkcloset.uk
- admin.kkcloset.uk

Do NOT re-add kkcloset.uk to this Worker.

Then:
   npm run deploy

TEST
1. Open:
   https://admin.kkcloset.uk/admin/orders

2. It should default to today's UK date.

3. Select another day from the calendar.
   Only that day's orders should load.

4. Click Today.
   It should return to today's orders.

5. Click an order number.
   Existing order detail page should still open.

NOTE
This phase does not depend on Resend, Stripe, password reset email, or MFA.
