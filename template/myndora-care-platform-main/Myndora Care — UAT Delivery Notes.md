# Myndora Care — UAT Delivery Notes (v2.0 full-stack)

Delivery date: 2026-08-02 · Build type: full-stack (React 19 + TypeScript + Vite frontend; tRPC 11 + Hono + Drizzle ORM + MySQL backend)

This update is a **functional extension, not a redesign**. The existing visual design, layouts, dashboards, colors, typography, spacing, cards, icons, navigation placement, responsive behavior, all five role portals, and every pre-existing page, route, button, and test record are preserved exactly; new functionality was layered on with the smallest necessary changes. Before/after screenshot evidence is in `screenshots/before/` and `screenshots/after/`.

---

## 1. Demo credentials (UAT)

One password for all demo accounts: **`myndora-demo-2026`**

| Role | Name | Email | Notes |
|---|---|---|---|
| Sponsor / family | Tunde Adeyemi | `sponsor@demo.myndora.test` | Sponsors Grace Okafor, Ngozi Eze, Bola Adeyemi, Kunle Okafor; also holds a Patient profile (scenario 18 dual-role switching) |
| Patient | Grace Okafor | `patient@demo.myndora.test` | 67, Ilorin, Assisted Monitoring package |
| CHW | Amina Bello | `chw@demo.myndora.test` | Approved CHEW, remote checks + home visits |
| Admin / operations | Maya Johnson | `admin@demo.myndora.test` | Operations & Trust Center (created internally only — never self-assigned) |
| Clinician | Dr. Kemi Adewale | `clinician@demo.myndora.test` | Clinical review (staff sign-in entry) |

**UAT Mode 1 — quick demo:** one-click Explore as Sponsor / Patient / CHW / Admin on the sign-in page; staff roles enter via "Staff sign-in".
**UAT Mode 2 — create account:** register any email at `/create-account`, pick an intent (Manage care for myself / Support or pay for someone's care / Apply as a CHW), verify with the simulated email code, and land in the matching onboarding form. There is no public Admin registration, and normal users can never self-assign Admin.

---

## 2. Implemented screens

### Public layer (signed out)
- `/` landing — the specified hero ("Trusted home-care coordination for patients and families") with its supporting text; 4 role cards (Patient / Sponsor or family supporter / Community Health Worker / Authorized Myndora Care staff) with their descriptions and actions; sections: How Myndora Care works, Patient-controlled family access, Verified CHW network, Visit verification and service quality, Package and city-based service availability, Labs/doctors/pharmacies/hospital partner ecosystem, Privacy and safety, and the Emergency disclaimer (Myndora does not replace emergency services)
- `/sign-in` — sign in + one-click demo access
- `/create-account` — registration (name, email, password, 3-option intent; no Admin option)
- `/forgot-password` / `/reset-password` — UAT simulated email codes
- `/staff-sign-in` — restricted staff entry (verifies an active Admin/Clinician profile)
- `/unauthorized` — access-blocked screen (direct URL entry never bypasses authorization)

### Onboarding (signed in)
- `/onboarding/choose` — "What would you like to do first?" (3 cards)
- `/onboarding/patient`, `/onboarding/sponsor` (includes the notice "The patient decides what health information you may access. Paying for care does not automatically provide health-information access."), `/onboarding/chw` (full CHW intake: photo, legal name, phone, NIN, city, service area, qualification, cadre, registration, experience, languages, 2 references, travel radius, availability days, requested services, consent to checks)

### CHW applicant portal (7 pages, dedicated shell)
- `/applicant` Application Status — 7-stage pipeline with current stage, outstanding actions, and terminal suspended/rejected banners
- `/applicant/identity`, `/applicant/qualifications`, `/applicant/references` — stage-locked editable forms
- `/applicant/training` — 5 modules, unlocked at `training_required`, passed badge once approved
- `/applicant/service-area`, `/applicant/settings`

### New menu pages in the existing portals (all real, testable screens — no placeholders)
- Sponsor / Patient: **Messages** (threads + send), **Account Settings** (account details, profile list with switching, addable profiles, privacy & safety summary)
- CHW: **Availability**, **Service Area**, **Profile & Verification** (5-check checklist), **Complaints & Disputes** (including responding to disputed visits), **Account Settings**
- Admin: **CHW Applications** (stage advance/suspend/reject + progress bar), **Credential Reviews**, **Visit Verification** (evidence badges + data-quality flag review), **Package Availability** (city × package toggle matrix), **User Administration** (accounts + profiles, activate/suspend/reject)

### UAT tooling
- **Demo toolbar** (seeded demo accounts only, never in production): current test role, switch demo role (all 5), reset demo data, restart guided tour, view test scenario, report prototype issue
- **Guided tours** — 5 role-specific steps after first login per role

---

## 3. UAT test report

### Automated: 192 passed / 0 failed (3 test files)
- `journeys.test.tsx` — all five role journeys: every route renders, every menu page is non-empty, key buttons/modals/forms work, payment-only restrictions hold, unauthorized routes redirect
- `auth.test.tsx` — public-layer copy, registration & verification (wrong code rejected → resend → success), login/logout, forgot/reset password, protected routes & authorization, profile switching, server persistence round-trip, demo tooling, data hygiene (banned surname absent from source)
- `logic.test.ts` — permissions, pricing, recommendation logic

### Browser-verified (production build + real MySQL)
| Scenario | Result |
|---|---|
| Landing copy, 4 role cards, demo buttons | ✅ |
| One-click demo sign-in for all 4 accounts into their portals | ✅ |
| Scenario 18: Tunde dual-profile switch (Sponsor ↔ Patient), isolated worlds, name-driven greetings | ✅ |
| New account (patient intent) → simulated code → onboarding → patient portal | ✅ |
| New account (CHW intent) → simulated code → CHW application form → submit → applicant portal at "Identity review" with outstanding actions | ✅ |
| CHW applicant visiting `/patient` or `/admin` directly → "Access not available" | ✅ |
| Applicant edit pages (Identity & Documents) — stage-locked forms work | ✅ |
| Admin advances Chidi Nwosu's application references_pending → training_required → approved_remote (scenarios 12/13) | ✅ |
| Sponsor Messages send; Account Settings dual profiles + switch + privacy summary | ✅ |
| Session persistence across reload | ✅ |
| Demo toolbar: switch role, view scenario, reset data, restart tour | ✅ |
| Mobile 390px: stacked cards, bottom mobile nav, tour card and toolbar clear of the nav | ✅ (fixed a real collision where the mobile nav blocked the tour card) |
| Server API (direct HTTP): register/verify/login/addProfile/state save-load round-trip/admin endpoints return 403 for non-admins | ✅ |

### Data hygiene
- Full source scan (code, comments, metadata, test records): the banned surname appears **nowhere**; no real personal information; all data is fictional demo data.

---

## 4. Security & authorization

- Role-based **and** relationship-based authorization; route guards (`RequireAuth` / `RequireProfile`) mounted on every protected route — direct URL entry does not grant access
- Payment ≠ health-information access: payment-only sponsors see no health data (stated on-screen; the patient independently controls access)
- CHW applicants cannot access patient records or CHW work areas until approved
- Admin access is created internally only; no self-assignment anywhere
- Sensitive access and consent changes are written to the audit log; notification previews stay masked
- Portal screens carry a name watermark; downloads and printing are restricted; session-timeout notice on shared devices
- Stated honestly: screenshots cannot be fully disabled on any device
- Verification/reset codes are UAT-simulated (labeled "UAT simulated email" on-screen); passwords are scrypt-hashed; sessions use a 30-day HttpOnly cookie

## 5. Persistence

- Accounts, profiles, CHW applications, and per-account world snapshots (the zustand demo state as JSON) are stored in **MySQL** — not only in browser localStorage; localStorage remains an offline fallback
- On login the client hydrates from the server; state changes auto-save with debounce

## 6. Known limitations

1. Verification and reset codes are UAT-simulated and shown on-screen (no real email service connected)
2. Each account holds one demo-world snapshot; cross-account live linkage (e.g. sponsor↔patient in real time) is simulated at the demo-data layer
3. CHW photos/documents are stored as file references — no real file upload in this build
4. Production hosts must fall back to `index.html` for direct sub-route loads (the delivered server already does)
5. Session timeout is communicated in-product; forced server-side expiry kick-out is not enabled

## 7. Deployment

```bash
# Requirements: Node 20+, MySQL 8 (connection string injected via platform env — never edit .env)
npm install
npm run build                              # produces dist/ (frontend + bundled server)
NODE_ENV=production node dist/boot.js      # serves on :3000
```

Schema migration: `npm run db:push` (structure push only — never `--force`, never drops tables).
Demo accounts are seeded on first one-click login; Admins can seed a sample CHW application from the CHW Applications screen.

## 8. Design-preservation evidence

`screenshots/before/` (v1 baseline) vs `screenshots/after/` (v2 delivery), paired one-to-one:
- Desktop 1440/1920: sponsor, sponsor_plan, patient, chw, admin dashboards — identical layout, colors, cards, and typography; only additive nav entries
- Mobile 390: mobile_sponsor, mobile_chw — same stacked cards and bottom-nav behavior
- New screens (landing, applicant_status, verify_simulated_code, sponsor_messages, account_settings, admin_chw_applications, chw_availability, …) reuse the same mc-* design system

## 9. Files changed vs the v1 baseline

- New public pages: `src/pages/public/{ForgotPassword,ResetPassword,StaffSignIn,Unauthorized}.tsx`
- New onboarding: `src/pages/onboarding/{Choose,PatientOnboarding,SponsorOnboarding,ChwOnboarding}.tsx`
- New guards/tour/toolbar: `src/components/{guards,GuidedTour,DemoToolbar}.tsx`
- New shared pages: `src/pages/shared/{Messages,AccountSettings}.tsx`
- New CHW pages: `src/pages/chw/{Availability,ServiceArea,Verification,Complaints}.tsx`
- New Admin pages: `src/pages/admin/{ChwApplications,CredentialReviews,VisitVerification,PackageAvailability,Users}.tsx`
- New applicant portal: `src/pages/applicant/{ApplicantLayout,Status,Identity,Qualifications,References,Training,ServiceArea}.tsx`
- Modified: `src/App.tsx` (routes), `src/components/RoleLayout.tsx` (nav items, profile switching, sign-out, tour/toolbar mounts), `src/components/GuidedTour.tsx` (mobile positioning fix), `src/store/useStore.ts` (identity, package availability, CHW actions), `src/store/auth.ts`, `api/authRouter.ts` (auth/onboarding/admin endpoints), `src/test/*` (test infra and cases)
- No existing route, feature, component, test record, or button was removed, renamed, or broken
