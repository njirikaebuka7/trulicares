# TruliCares Deployment Guide (Vercel & Supabase)

This document provides a step-by-step technical guide for deploying the **TruliCares Monorepo** (React/Vite Frontend + Express/Node Backend) to **Vercel**, integrated with a **Supabase PostgreSQL** database.

---

## 🛠️ Monorepo Architecture Overview

TruliCares is structured as a standard **NPM Workspaces** monorepo:
*   **Root Folder:** Monorepo package orchestrator and global configurations.
*   **`apps/web` (Frontend):** A high-performance React application bundled with Vite and styled with Tailwind CSS.
*   **`apps/api` (Backend):** An Express API running on Node.js, utilizing PostgreSQL (Supabase) for structured data and triggers, Stripe for payment flows, and Resend for transaction emails.

---

## 💾 Phase 1: Database Setup (Supabase)

The backend connects directly to PostgreSQL. The easiest way to deploy this is using **Supabase**.

1.  **Create a Supabase Project:**
    *   Sign in to [Supabase](https://supabase.com/).
    *   Create a new project named `trulicares`. Set a strong database password and copy it down.
    *   Once provisioned, go to **Project Settings > Database** and copy the **Transaction Connection String (URI)** or **Direct Connection String (URI)**.
        *   *Format:* `postgresql://postgres.[username]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

2.  **Execute Database Migrations:**
    This monorepo includes migration files under `supabase/migrations/` to set up all tables, triggers, and functions automatically.
    *   Ensure your local `.env` has `DATABASE_URL` pointing to your new Supabase database connection string.
    *   Run the migration tool from the root directory:
        ```bash
        node run_migration.js
        ```
    *   *Alternative:* You can copy-paste the SQL contents from the `supabase/migrations/` files in order (sorted by name/date) directly into the **Supabase SQL Editor** and execute them.

3.  **Seed the Database (Optional):**
    If you wish to seed initial data (mock caregivers, admin accounts, facilities):
    *   Make sure you are in `apps/api/`.
    *   Run the seed script:
        ```bash
        npm run seed -w apps/api
        ```

---

## 🌐 Phase 2: Deploying the Backend API (`apps/api`)

To run Express on Vercel without continuous server overhead, we deploy it as a **Serverless Function**.

### How it Works:
*   We created [apps/api/api/index.js](file:///c:/Users/HP/Videos/AI%20videos/Trulicareszip/apps/api/api/index.js) which acts as the serverless bridge, exporting the compiled Express `app` directly to Vercel's Node.js runtime.
*   We added [apps/api/vercel.json](file:///c:/Users/HP/Videos/AI%20videos/Trulicareszip/apps/api/vercel.json) to rewrite all incoming traffic to that serverless entrypoint.

### Vercel Deployment Steps:

1.  **Connect Repo to Vercel:**
    *   Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
    *   Import your `trulicares` git repository.
2.  **Configure Project Settings:**
    *   **Project Name:** `trulicares-api`
    *   **Framework Preset:** `Other` (do not select Vite or React here)
    *   **Root Directory:** Set this to **`apps/api`** (CRITICAL).
    *   **Build & Development Settings:**
        *   Keep defaults. Vercel will auto-detect the root workspaces and run `npm run build` inside `apps/api` (which compiles TypeScript to `dist/`).
3.  **Configure Environment Variables:**
    Add the following environment variables in the Vercel dashboard for this project:

    | Variable Name | Description | Example |
    |---|---|---|
    | `DATABASE_URL` | Supabase Connection String (with transaction pooling recommended) | `postgresql://...` |
    | `JWT_SECRET` | Secret token used to sign auth JWTs (generate a long random string) | `your_super_secret_jwt_string_123!` |
    | `STRIPE_SECRET_KEY` | Stripe developer API secret key | `sk_test_...` |
    | `RESEND_API_KEY` | Resend developer API key for system emails | `re_...` |
    | `NODE_ENV` | Environment identifier | `production` |

4.  **Deploy:**
    *   Click **Deploy**.
    *   Once finished, copy your deployed backend API domain (e.g., `https://trulicares-api.vercel.app`).

---

## 🎨 Phase 3: Deploying the Frontend (`apps/web`)

The React application is deployed separately as a static SPA.

### How it Works:
*   We added [apps/web/vercel.json](file:///c:/Users/HP/Videos/AI%20videos/Trulicareszip/apps/web/vercel.json) to configure client-side SPA routing (routing unmatched paths to `index.html` to avoid 404s on page refresh).
*   It also contains an `/api/:path*` rewrite proxy rules.

### Vercel Deployment Steps:

1.  **Configure `vercel.json` with your API Domain:**
    *   Open [apps/web/vercel.json](file:///c:/Users/HP/Videos/AI%20videos/Trulicareszip/apps/web/vercel.json).
    *   Replace `https://YOUR-BACKEND-API-DOMAIN.vercel.app` with the actual backend deployment URL you obtained in Phase 2:
        ```json
        {
          "version": 2,
          "rewrites": [
            {
              "source": "/api/:path*",
              "destination": "https://trulicares-api.vercel.app/api/:path*"
            },
            {
              "source": "/(.*)",
              "destination": "/index.html"
            }
          ]
        }
        ```
    *   Commit and push this change to your Git repository.

2.  **Connect Repo to Vercel (Create a Second Project):**
    *   Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
    *   Import your `trulicares` git repository again.
3.  **Configure Project Settings:**
    *   **Project Name:** `trulicares` (or `trulicares-frontend`)
    *   **Framework Preset:** `Vite` (Vercel should auto-detect this)
    *   **Root Directory:** Set this to **`apps/web`** (CRITICAL).
    *   **Build & Development Settings:**
        *   Keep defaults. Vercel will install the workspace dependencies and run `vite build`, outputting static files in `dist/`.
4.  **Configure Environment Variables:**
    Add the following environment variables:

    | Variable Name | Description | Example |
    |---|---|---|
    | `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe developer API publishable key | `pk_test_...` |

    *Note: You do NOT need a `VITE_API_URL` variable because the frontend relies on the relative `/api` path, which is automatically proxied in the background to your backend API domain by Vercel's rewrite rules, eliminating CORS headaches.*

5.  **Deploy:**
    *   Click **Deploy**.
    *   Once complete, open your deployed frontend domain (e.g. `https://trulicares.vercel.app`). Your app is now live!

---

## ⚡ Post-Deployment Integrations

### 💳 Stripe Webhook Configuration
To process live or test caregiver premium matches and bookings, configure Stripe webhooks:
1.  Go to your **Stripe Dashboard > Developers > Webhooks**.
2.  Click **Add Endpoint**.
3.  Set the endpoint URL to point to your deployed backend's webhook route:
    *   `https://trulicares-api.vercel.app/api/stripe/webhook`
4.  Select the following events to listen to:
    *   `payment_intent.succeeded`
    *   `payment_intent.payment_failed`
    *   `checkout.session.completed`
5.  Obtain the **Signing Secret** (starts with `whsec_...`) and add it to your Backend Vercel project as an environment variable named **`STRIPE_WEBHOOK_SECRET`**. Redeploy the backend so it takes effect.

---

## 🛠️ Local Development Reminder
When developing locally:
*   Make sure you run `cmd.exe /c npm run dev` from the monorepo root.
*   Your local `.env` file contains keys for both frontend and backend testing.
