# TruliCares Monorepo

Welcome to the TruliCares monorepo. This project is structured to manage both the frontend and backend in a unified workspace.

## Project Structure

- `apps/web`: React frontend powered by Vite and TailwindCSS.
- `apps/api`: Express backend powered by TypeScript and PostgreSQL.
- `supabase/migrations`: SQL migration files for your Supabase database.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v7 or higher)

### Installation

Install dependencies for all workspaces from the root:

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with your actual credentials (Supabase, Stripe, Resend).

### Development

Run both the frontend and backend simultaneously in development mode:

```bash
npm run dev
```

- Frontend: [http://localhost:5000](http://localhost:5000)
- Backend API: [http://localhost:3001](http://localhost:3001)

### Building for Production

Build both applications:

```bash
npm run build
```

The frontend build will be located in `apps/web/dist` and the backend build in `apps/api/dist`.

### Database Migrations

You can find the schema and migration scripts in `supabase/migrations`. To apply them manually or via the Supabase CLI, follow the Supabase documentation.

## Deployment

This monorepo is designed to be easily deployable. 
- The backend serves the built frontend from `apps/web/dist` when `NODE_ENV=production` is set.
- Alternatively, you can deploy the `web` and `api` apps independently to platforms like Vercel, Netlify, or Railway.
