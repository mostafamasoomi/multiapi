# 🔍 گزارش نقدانه استادانه — MultiAPI Platform
**تاریخ:** 1405/04/23 | **بازرس:** Senior Engineering Review

---

## 📊 خلاصه وضعیت

| لایه | وضعیت | امتیاز |
|------|--------|--------|
| Backend API | ✅ 22/22 pass | 8/10 |
| Auth System | ✅ bcrypt + DB tokens | 7/10 |
| Chat/SSE | ✅ streaming working | 7/10 |
| Wallet/Ledger | ✅ atomic, DB constraints | 8/10 |
| Brakes System | ✅ circuit breaker + kill switch | 8/10 |
| Payment (Zarinpal) | ⚠️ wired, untested live | 5/10 |
| Referral | ✅ DB-backed, earnings | 7/10 |
| Admin Panel | ✅ working (local frontend) | 6/10 |
| Frontend (User) | ⚠️ partially broken | 5/10 |
| Frontend (Admin) | ✅ working | 7/10 |
| Infrastructure | ⚠️ Docker build issues | 4/10 |
| **Overall** | | **6.5/10** |

---

## 🔴 P0 — بحرانی (امنیت / از دست رفتن داده)

### 1. API Keys — 100% Fake localStorage
**فایل:** `frontend/app/(app)/api-keys/page.tsx`
**مشکل:** صفحه مدیریت API Keys کاملاً localStorage-based هست. Backend مدل `UserApiToken` داره ولی **هیچ CRUD endpoint** براش نیست. کلیدها client-side تولید میشن (`sk-key_xxx`) و اگر کاربر browser data رو پاک کنه، همه کلیدها از بین میره.
**ریسک:** کاربر API key تولید میکنه → فکر میکنه واقعیه → ولی backend اصلاً نمیشناستش → chat fails silently.
**راهحل:** CRUD endpoints برای `UserApiToken` + frontend واقعی کردن.

### 2. Conversations — 100% localStorage
**فایل:** `frontend/app/app/page.tsx`
**مشکل:** تمام مکالمات چت در localStorage ذخیره میشن. هیچ server-side sync نیست. کاربر با پاک کردن browser data یا تعویض دستگاه، **تمام تاریخچه چتش رو از دست میده**.
**ریسک:** از دست رفتن کامل مکالمات. برای پلتفرم paid این غیرقابل قبوله.
**راهحل:** API endpoint برای CRUD مکالمات + sync server-side.

### 3. Admin Models List بدون Auth
**فایل:** `backend/app/routers/admin.py:391`
**مشکل:** `GET /admin/models/list` هیچ auth dependency نداره. هرکسی میتونه لیست کامل مدلها + internal details (upstream model names, provider) رو ببینه.
**ریسک:** leak اطلاعات internal infrastructure.
**راهحل:** یا auth اضافه کنه، یا فیلدهای حساس رو حذف کنه.

---

## 🟠 P1 — شکسته / ناقص

### 4. Dashboard + Usage — Wrong API URL
**فایل:** `frontend/app/dashboard/page.tsx:9`, `frontend/app/(app)/usage/page.tsx:11`
**مشکل:** هر دو صفحه از `NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8800'` استفاده میکنن. ولی Next.js proxy از طریق rewrites کار میکنه. این یعنی:
- اگر `NEXT_PUBLIC_API_URL` تنظیم نباشه → مستقیماً به backend وصل میشه → **CORS error**
- اگر تنظیم باشه → مستقیماً به backend وصل میشه → **CORS error**
**راهحل:** همه صفحات باید از relative paths (`/api/...`) استفاده کنن.

### 5. Dead Rewrites — `/api/memory`
**فایل:** `frontend/next.config.js:24-25`
**مشکل:** Rewrites برای `/api/memory` و `/api/memory/:path*` وجود داره ولی backend **هیچ memory endpoint** نداره.
**راهحل:** حذف rewrites مرده.

### 6. Frontend Dual Styling Systems
**فایل:** `frontend/app/app/` vs `frontend/app/dashboard/`
**مشکل:** دو سیستم styling متفاوت:
- `/app/` pages: CSS variables + inline styles
- `/dashboard/`, `/usage/`: Tailwind CSS + `@/components/ui`
- `/app/profile/`: CSS-in-JS (`style jsx`)
**نتیجه:** ظاهر ناهمگون، maintainability پایین.
**راهحل:** یک سیستم styling واحد (ترجیحاً Tailwind).

### 7. Chat `count_tokens` Inefficiency
**فایل:** `backend/app/routers/chat.py:23-24`
**مشکل:** `count_tokens()` روی **تمام messages** اجرا میشه، نه فقط پیام جدید. برای مکالمات طولانی، این باعث tokenization تکراری میشه.
**راهحل:** فقط پیام جدید رو tokenize کنه + cache کنه.

---

## 🟡 P2 — کیفیت / UX

### 8. Registration Flow — No Email Verification
**فایل:** `backend/app/routers/auth.py:104`
**مشکل:** ثبتنام بدون تأیید ایمیل. کاربر هر ایمیلی وارد کنه ثبت میشه.
**تاثیر:** spam accounts, data integrity.

### 9. No Password Reset
**مشکل:** کاربر رمز عبورش رو فراموش کنه، هیچ راهی برای بازیابی نیست.

### 10. Wallet Balance Not Refreshing After Chat
**فایل:** `frontend/app/app/page.tsx`
**مشکل:** بعد از چت، `setWalletRefresh(r => r + 1)` صدا زده میشه ولی `WalletDisplay` component باید این trigger رو بگیره و refresh کنه. اگر component mount نباشه، refresh انجام نمیشه.

### 11. Admin Panel — No User Detail View
**مشکل:** Admin میتونه لیست کاربرها رو ببینه ولی روی هیچکلیک نمیکنه. No drill-down to user detail, no edit modal, no per-user ledger view.

### 12. No Conversation Title Auto-Generation
**فایل:** `frontend/app/app/page.tsx`
**مشکل:** عنوان مکالمات از اولین 30 کاراکتر پیام گرفته میشه. Title smarter نیست.

---

## 🟢 P3 — Nice to Have

| # | Feature | Effort |
|---|---------|--------|
| 13 | Email verification | 2h |
| 14 | Password reset (email link) | 3h |
| 15 | 2FA/MFA | 1 day |
| 16 | Conversation export (JSON/Markdown) | 2h |
| 17 | Model comparison view | 1 day |
| 18 | Usage analytics dashboard | 2 days |
| 19 | API rate limit in Redis | 2h |
| 20 | Docker Hub access fix | infra |
| 21 | Next.js standalone build fix | 1h |

---

## ✅ چی خوب کار میکنه

| Feature | Quality | Note |
|---------|---------|------|
| Auth (register/login/logout) | ⭐⭐⭐⭐ | bcrypt, DB tokens, HttpOnly cookies |
| Chat streaming (SSE) | ⭐⭐⭐⭐ | 9Router proxy, proper settlement |
| Wallet + Ledger | ⭐⭐⭐⭐⭐ | Atomic ops, DB constraints, double-entry |
| Brakes system | ⭐⭐⭐⭐ | Circuit breaker, kill switch, margin brake |
| Referral system | ⭐⭐⭐⭐ | DB-backed, 10% earnings, ledger tracking |
| Landing page | ⭐⭐⭐⭐ | Professional, RTL, dark theme |
| Notifications page | ⭐⭐⭐⭐ | Empty state, mark as read |
| Profile page | ⭐⭐⭐ | Edit phone, change password |
| Payment page | ⭐⭐⭐ | History, status badges |

---

## 🎯 فاز بعدی — پیشنهاد

### Phase 4: API Keys + Conversations (Data Persistence)
**مدت:** 2-3 روز
**اولویت:** P0

1. **API Keys CRUD endpoints** (backend)
   - `GET /api/me/api-keys` — لیست کلیدها
   - `POST /api/me/api-keys` — ایجاد کلید جدید
   - `DELETE /api/me/api-keys/:id` — حذف کلید
   - Frontend: واقعی کردن صفحه api-keys

2. **Conversations CRUD endpoints** (backend)
   - `GET /api/conversations` — لیست مکالمات
   - `POST /api/conversations` — ایجاد مکالمه
   - `PUT /api/conversations/:id` — بروزرسانی عنوان/پیامها
   - `DELETE /api/conversations/:id` — حذف
   - Frontend: sync با server-side

3. **Fix broken pages**
   - Dashboard: relative paths
   - Usage: relative paths
   - Admin models/list: add auth or sanitize

### Phase 5: Admin UX + Security
**مدت:** 1-2 روز

4. Admin user detail view
5. Admin user edit modal
6. Admin user ledger view
7. Rate limiter → Redis
8. Email verification (optional)

### Phase 6: Production Readiness
**مدت:** 2-3 روز

9. Docker build fix (standalone → next start)
10. Password reset flow
11. API documentation (Swagger/OpenAPI)
12. Error monitoring (Sentry or similar)
