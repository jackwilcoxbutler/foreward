# Rounds

A mobile-first Next.js app that turns a golf scorecard into a colorful, shareable recap.

## Local setup

1. Use Node 22.13 or newer.
2. Copy `.env.example` to `.env.local` and add your Supabase project values.
3. Run `supabase/migrations/20260718000000_create_rounds.sql` in the Supabase SQL editor.
4. Run `npm install`, then `npm run dev`.

OpenGolfAPI course reads are keyless. Supabase is only required when a golfer saves a permanent public round; the landing page, example round, course search, manual entry, score entry, and review flow work without it.

## Environment

- `NEXT_PUBLIC_SITE_URL`: deployed origin used for metadata.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by the round API routes. Never expose this value to the browser.

## Deploying

Set the same three environment values in the hosting provider. The project is built with Next.js, TypeScript, and Tailwind CSS.
