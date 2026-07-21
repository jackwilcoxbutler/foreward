# Rounds

A mobile-first Next.js app that turns a golf scorecard into a colorful, shareable recap.

## Local setup

1. Use Node 22.13 or newer.
2. Copy `.env.example` to `.env.local` and add your Supabase project values.
3. Run both SQL files in `supabase/migrations/` in timestamp order in the Supabase SQL editor.
4. Run `npm install`, then `npm run dev`.

OpenGolfAPI course reads are keyless. The landing page, example round, course search, custom entry, score entry, review flow, and local drafts work anonymously. Supabase is required only at the final account/save step and for history, privacy, and saved-course features.

## Environment

- `NEXT_PUBLIC_SITE_URL`: deployed origin used for metadata.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe publishable/anon key used only for Supabase Auth.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by the round API routes. Never expose this value to the browser.

## Supabase Auth setup

1. In **Authentication → Providers → Email**, enable Email and turn **Confirm email** off. This is required so the post-round account wall can sign the golfer in and save/share immediately. They can verify later if verification is enabled as a separate follow-up.
2. In **Authentication → URL Configuration**, set the Site URL to the production Vercel domain and add `https://your-domain.com/reset-password` plus the local equivalent as redirect URLs.
3. Copy the project URL, anon/publishable key, and service-role key into Vercel for Production and Preview. The service-role key must remain server-only.
4. Apply `20260719000000_v11_accounts_history_courses.sql`. It adds auth-backed profiles, ownership/privacy fields, saved/custom courses, archive-ready subscription fields, and cascading account deletion while preserving existing anonymous rounds.

All application rows remain behind RLS with no browser table policies. Browser code talks directly to Supabase only for authentication; authenticated app APIs validate the access token and perform scoped data work on the server.

## Deploying to Vercel

Import the repository as a Next.js project and leave the Root Directory set to the repository root (`./`), not `app/`. Set all four environment values for Production and Preview, then deploy from `main`. Vercel should use the default `next build` command and `.next` output automatically. Use Node.js 22 or newer.
