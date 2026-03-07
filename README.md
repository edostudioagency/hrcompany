# HR Manager

Application de gestion des ressources humaines (RH) en francais.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, edge functions)
- Tanstack React Query

## Getting Started

```sh
npm install
npm run dev
```

The development server will start on `http://localhost:8080`.

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

For Supabase edge functions:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RESEND_API_KEY` - Resend API key for sending emails
- `SITE_URL` - Production site URL
