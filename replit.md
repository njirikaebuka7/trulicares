# TruliCares — Care Marketplace

## Project Overview

TruliCares is a full-featured care marketplace web application built with React, Vite, TypeScript, and Tailwind CSS. It connects families who need care services with verified caregivers across four care categories: Child Care, Senior Care, Adult Care, and Cleaning Services.

---

## Tech Stack

- **React 19** + **Vite 7** — fast SPA with HMR
- **TypeScript** — strict typing throughout
- **Tailwind CSS 4** — utility-first styling with custom brand/coral/warm color tokens
- **React Router 7** — client-side routing with nested layouts
- **Lucide React** — icon library
- **Assets** — local images in `src/assets/`

---

## Core Features

### Public Marketing Site (inside `<Layout />` with navbar + footer)
- **Home** (`/`) — hero, service categories, how-it-works, testimonials, CTA
- **About** (`/about`) — mission, team, values
- **Services** (`/services`) — care category breakdown
- **Resources** (`/resources`) — filterable article/guide library with 6 articles across Child Care, Senior Care, Adult Care, and Cleaning; each card links to a full article page
- **Resource Article** (`/resources/:id`) — full rich-text article with hero image, breadcrumb, author, read time, share/bookmark buttons, highlighted callout boxes, related articles, and a "Find a Caregiver" CTA
- **Caregiver Profile** (`/caregivers/:id`) — public profile page with photo, ratings, verification badges, bio, specialties, hourly rate, credentials checklist, sample reviews, and Request Care / Message CTAs
- **Contact** (`/contact`) — contact form
- **Privacy Policy, Terms, Cookie Policy** — legal pages

### Authentication
- **Login** (`/login`) — email + password sign-in, Google/Apple social placeholders, **inline Forgot Password flow** (email entry → "Check your email" confirmation → try again), "Join instead" modal trigger
- **Role-based routing** — email containing `admin` → Admin Dashboard, `caregiver`/`provider` → Caregiver Dashboard, all others → Family Dashboard

### GetStarted Modal
- Triggered from the navbar and Login page
- Multi-step questionnaire (role selection → care type → schedule → location → messaging unlock → payment)
- **Mobile bottom-sheet** on small screens (slides up from bottom with handle bar), centered card on `sm+`

### Family Dashboard (`/dashboard`)
- **Bottom navigation** (mobile): Overview, My Requests, Matches, Messages, Profile — with "More" drawer for Schedule and Payments
- **Desktop sidebar** with collapsible panel
- **Tabs**: Overview · My Requests · Matches · Schedule · Messages · Payments · Profile
- **Messages tab** — multi-conversation thread list (3 caregivers); each thread has its own message history; sending a message triggers a 2-second auto-reply; Enter key sends; list auto-scrolls to newest message
- **Matches tab** — caregiver match cards with "View Full Profile" linking to `/caregivers/:id` and "Message" / "Unlock Messaging" actions
- Profile editing, notification preferences, privacy settings, payment methods

### Caregiver Dashboard (`/dashboard`)
- **Bottom navigation** (mobile): Overview, Job Requests, My Clients, Earnings, Profile — with "More" drawer for Schedule and Reviews
- **Tabs**: Overview · Job Requests · My Clients · Schedule · Earnings · Reviews · Profile
- Accepts/declines job requests, client management, earnings summary, review display

### Admin Dashboard (`/dashboard`)
- **Desktop sidebar** — collapsible, slate-900 themed
- **Mobile bottom navigation** — 5 tabs fitting without overflow: Overview, Users, Verification Queue, Reports, Analytics
- **Tabs**: Overview · Users · Verification Queue · Reports · Analytics
- User table with search, filter, pagination; verification approve/reject workflow; report resolve/dismiss workflow; analytics metrics and charts

---

## Project Structure

```
src/
├── assets/              # Images (logo, hero, blog photos, service photos)
├── components/
│   ├── layout/          # Navbar, Footer, Layout wrapper, ScrollToTop
│   ├── questionnaire/   # Multi-step GetStarted flow steps
│   └── ui/              # Button, GetStartedModal, reusable UI
├── context/
│   └── AuthContext.tsx  # Auth state, login/logout, role detection
├── data/
│   └── mock.ts          # CaregiverProfile[], CareMatch[], testimonials, schedule, payments, admin data
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Services.tsx
│   ├── Resources.tsx
│   ├── ResourceArticle.tsx   # Full article detail page (/resources/:id)
│   ├── CaregiverProfile.tsx  # Public caregiver profile (/caregivers/:id)
│   ├── Contact.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx         # Auth-gated router to role dashboards
│   ├── FindCare.tsx          # Multi-step care request questionnaire
│   ├── ProvideCare.tsx       # Caregiver onboarding flow
│   ├── NotFound.tsx
│   ├── PrivacyPolicy.tsx
│   ├── Terms.tsx
│   ├── CookiePolicy.tsx
│   └── dashboards/
│       ├── FamilyDashboard.tsx
│       ├── CaregiverDashboard.tsx
│       └── AdminDashboard.tsx
├── types/               # TypeScript interfaces (CaregiverProfile, CareMatch, etc.)
├── utils/
│   └── cn.ts            # Tailwind class merging utility
└── App.tsx              # Route definitions
```

---

## Routes

| Path | Component | Layout |
|---|---|---|
| `/` | Home | Marketing (navbar + footer) |
| `/about` | About | Marketing |
| `/services` | Services | Marketing |
| `/resources` | Resources | Marketing |
| `/resources/:id` | ResourceArticle | Marketing |
| `/caregivers/:id` | CaregiverProfile | Marketing |
| `/contact` | Contact | Marketing |
| `/privacy-policy` | PrivacyPolicy | Marketing |
| `/terms` | Terms | Marketing |
| `/cookie-policy` | CookiePolicy | Marketing |
| `/login` | Login | Full-screen |
| `/dashboard` | Dashboard (→ role dashboard) | Full-screen |
| `/find-care` | FindCare | Full-screen |
| `/provide-care` | ProvideCare | Full-screen |

---

## User Preferences

- Brand colors use `brand-*` tokens (green), accent coral uses `coral-*` tokens
- Caregiver photos from `randomuser.me` portraits
- Mobile-first design — dashboards use `h-[100dvh]` with fixed bottom nav and `pb-20`/`pb-24` content padding
- All dashboard headers are `h-14` sticky with `top-0 z-10`
- Sidebar desktop breakpoint: `lg:` (1024px)
- Avatar color rotation: `['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400']`
- Logo import: `import logoImg from '@/assets/logo.png'`; use `brightness-0 invert` on dark backgrounds
