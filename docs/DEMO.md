# Six-minute demo

Open the live app at https://pathshala-web-eight.vercel.app — it runs on Atlas with the same
seed. Payments and the gateway are in test mode; no real money moves. To run it locally, use
the commands at the end of this page. Open `http://127.0.0.1:59800` (not `localhost`, so the
session cookie sticks).

Anyone can create a learner account from the sign-in page. The seeded role accounts below are
listed there only when `DEMO_AUTH=true`, which production keeps off:

| Role | Email | Password |
| --- | --- | --- |
| Learner | `student@pathshala.dev` | `student-demo-2026` |
| Instructor | `instructor@pathshala.dev` | `instructor-demo-2026` |
| Admin | `admin@pathshala.dev` | `admin-demo-2026` |

## 0:00 — A calm bilingual catalogue

1. Open the Bangla home at `/`; switch to **English** in the header.
2. Go to **Courses**, search `JavaScript`, open **First Steps in JavaScript**.
3. Point out the price, rating, curriculum and the test-mode note. A learner can preview a
   lesson without enrolling.

## 1:10 — A learner finishes a course

1. Sign in as the learner. The dashboard shows enrolled courses, progress and the live
   reminder.
2. Open **First Steps in JavaScript**. Mark the last unfinished lesson complete.
3. Open the **Certificate** link. Show the public certificate, the QR code and the
   certificate number. Open the same URL in a private window: it needs no login.

## 2:10 — Live class and calendar

1. Open **Open the live room** from the course page.
2. Show the embedded Jitsi room, the new-tab fallback, attendance and **Add to calendar**.
3. The dashboard reminder was produced by the min-heap dispatcher; the studio attendance
   log shows the learner.

## 3:20 — Test checkout

1. Sign in as the learner, open **Excel for Office Work**, choose **Buy this course**.
2. Apply `EARLYBIRD`; the order drops by 20 percent.
3. Choose **PayBridge**, pay with `4242 4242 4242 4242`, any future expiry and any CVC.
4. Show the receipt, the active enrolment and the ledger split on the PayBridge dashboard
   (`http://127.0.0.1:59801/login`, password is in `apps/paybridge/.env.local`).
5. Say clearly: test mode, no real money. The order became paid only after the signed
   webhook, not on the browser return. The same flow works with the Stripe test rail.

## 4:40 — Instructor studio

1. Sign out, sign in as the instructor, open **Studio**.
2. Show revenue, paid sales, students, completion and attendance. Open a course and show
   the **Course performance** table.
3. Scroll to **Live classes**, schedule a class, and point out the generated room and
   reminders for enrolled learners.

## 5:20 — Admin trust

1. Sign in as the admin, open **Admin**.
2. Show the operating report: users, courses, published, enrolments, certificates, live
   sessions and test revenue.
3. Unpublish and republish a course, then point at the new **Audit log** row.
4. Download **Export CSV**; mention that cells are quoted and formula-safe.

## Local commands

```bash
pnpm db:dev
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm db:seed
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/web exec next dev -p 59800
pnpm --filter @pathshala/paybridge dev
```

## If something is missing

- The memory database resets on restart: run `pnpm db:seed` again.
- PayBridge needs `apps/paybridge/.env.local` and the web `PAYBRIDGE_*` values; without them
  the checkout shows the Stripe rail only.
- Real Stripe redirects, Google sign-in and the deployed web origin need the owner keys and
  Atlas; the app states the limitation instead of faking a result.
