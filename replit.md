# TruliCares — Care Marketplace

## Project Overview

TruliCares is a fully-featured care marketplace web application built with React, Vite, TypeScript, and Tailwind CSS. It connects families who need care services with verified caregivers across four care categories: Child Care, Senior Care, Adult Care, and Cleaning Services.

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
- **Home** (`/`) — hero, service categories, how-it-works, trust & safety, testimonials, CTA
- **About** (`/about`) — mission, team, values
- **Services** (`/services`) — care category breakdown
- **Browse Caregivers** (`/caregivers`) — searchable, filterable caregiver directory; real-time filter by category (Child Care, Senior Care, Adult Care, Cleaning), verified-only toggle, background-checked toggle, sort by rating/price/experience; each card links to full profile
- **Resources** (`/resources`) — filterable article/guide library with 6 articles across all care categories
- **Resource Article** (`/resources/:id`) — full rich-text article with hero image, breadcrumb, author, read time, share/bookmark buttons, highlighted callout boxes, related articles, and a "Find a Caregiver" CTA
- **Caregiver Profile** (`/caregivers/:id`) — public profile page with photo, ratings, verification badges, bio, specialties, hourly rate, credentials checklist, sample reviews, and Request Care / Message CTAs
- **Contact** (`/contact`) — contact form with submit state
- **Privacy Policy, Terms, Cookie Policy** — legal pages

### Navigation
- **Navbar** — links: Home, About, Services, Caregivers, Resources, Contact; authenticated user dropdown (Dashboard + Logout); mobile hamburger menu
- **Footer** — sitemap, legal links, social

### Authentication
- **Login** (`/login`) — email + password sign-in, Google/Apple social placeholders, **inline Forgot Password flow** (email entry → "Check your email" confirmation → back to sign in), "Join instead" modal trigger
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
- **Profile tab** — displays saved name (updates when user edits personal info modal); profile photo upload; notification/privacy/account settings modals
- **Payments tab** — transaction history, payment methods, add card modal
- Profile editing, notification preferences, privacy settings, payment methods

### Caregiver Dashboard (`/dashboard`)
- **Bottom navigation** (mobile): Overview, Job Requests, Messages, Earnings, Profile — with "More" drawer for My Clients, Schedule, and Reviews
- **Desktop sidebar** — collapsible, emerald-themed
- **Tabs**: Overview · Job Requests · Messages · My Clients · Schedule · Earnings · Reviews · Profile
- **Messages tab** — inbox of family conversations; thread list with unread indicators; per-thread full chat history; functional send with auto-reply after 2 seconds; Enter key sends
- **Job Requests tab** — accept/decline pending job requests with modal confirmation
- **My Clients tab** — active/past client cards with per-client messaging panel
- **Profile tab** — hourly rate range reflects live state from "Update Rates" modal; bio, specialties, availability, notification, account settings modals
- Earnings summary with weekly bar chart, schedule, and review display

### Admin Dashboard (`/dashboard`)
- **Desktop sidebar** — collapsible, slate-900 themed
- **Mobile bottom navigation** — 5 tabs: Overview, Users, Verification Queue, Reports, Analytics
- **Tabs**: Overview · Users · Verification Queue · Reports · Analytics
- User table with search, filter, pagination; verification approve/reject workflow; report resolve/dismiss workflow; analytics metrics and charts

---

## Project Structure

```
src/
├── assets/              # Images (logo, hero, blog photos, service photos)
├── components/
│   ├── home/            # HeroSection, ServicesSection, HowItWorks, TrustSafety, etc.
│   ├── layout/          # Navbar, Footer, Layout wrapper, ScrollToTop
│   ├── questionnaire/   # Multi-step GetStarted flow steps (12 components)
│   └── ui/              # Button, GetStartedModal, SelectCard, reusable UI
├── context/
│   └── AuthContext.tsx  # Auth state, login/logout, signup, role detection
├── data/
│   └── mock.ts          # CaregiverProfile[], CareMatch[], testimonials, schedule, payments, admin data
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Services.tsx
│   ├── Resources.tsx
│   ├── ResourceArticle.tsx   # Full article detail page (/resources/:id)
│   ├── CaregiverList.tsx     # Browse/search all caregivers (/caregivers)
│   ├── CaregiverProfile.tsx  # Public caregiver profile (/caregivers/:id)
│   ├── Contact.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx         # Auth-gated router to role dashboards
│   ├── FindCare.tsx          # Multi-step care request questionnaire (9 phases)
│   ├── ProvideCare.tsx       # Caregiver onboarding flow (4 steps)
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
| `/caregivers` | CaregiverList | Marketing |
| `/caregivers/:id` | CaregiverProfile | Marketing |
| `/resources` | Resources | Marketing |
| `/resources/:id` | ResourceArticle | Marketing |
| `/contact` | Contact | Marketing |
| `/privacy-policy` | PrivacyPolicy | Marketing |
| `/terms` | Terms | Marketing |
| `/cookie-policy` | CookiePolicy | Marketing |
| `/login` | Login | Full-screen |
| `/dashboard` | Dashboard (→ role dashboard) | Full-screen |
| `/find-care` | FindCare | Full-screen |
| `/provide-care` | ProvideCare | Full-screen |

---

## FindCare Flow (9 Phases)

`care-type` → `care-details` (4 sub-flows: child/senior/adult/cleaning) → `account` → `review` → `matching` → `matches` → `payment` → `verification` → `messaging`

---

## User Preferences

- Brand colors use `brand-*` tokens (green), accent coral uses `coral-*` tokens
- Caregiver photos from `randomuser.me` portraits
- Mobile-first design — dashboards use `h-[100dvh]` with fixed bottom nav and `pb-20`/`pb-24` content padding
- All dashboard headers are `h-14` sticky with `top-0 z-10`
- Sidebar desktop breakpoint: `lg:` (1024px)
- Avatar color rotation: `['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400']`
- Logo import: `import logoImg from '@/assets/logo.png'`; use `brightness-0 invert` on dark backgrounds
- Caregiver Dashboard accent: emerald (`emerald-600`, `emerald-700`)
- Admin Dashboard accent: slate (`slate-900`, `slate-800`)
- Family Dashboard accent: brand green (`brand-600`, `brand-700`)
