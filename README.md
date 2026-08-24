# Kutz

Barber booking app — customers find barbershops nearby, book cuts, earn loyalty rewards; barbers manage their schedule and work sessions; owners run their shops; admins oversee the platform.

Built with Expo SDK 54 · React Native 0.81 · expo-router (typed routes) · Clerk (auth) · Supabase (data, RLS, RPCs) · MapLibre.

## Prerequisites

- [Node.js](https://nodejs.org) LTS (v20+)
- npm
- A physical phone with the **Expo Go** app ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)), or Android Studio / Xcode simulators
- Environment keys — see step 3

## Getting started

1. Clone and install:

   ```bash
   git clone https://github.com/mezianizakarya/KUTZ.git
   cd KUTZ
   npm install
   ```

2. Create a `.env` file in the project root:

   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_KEY=...
   ```

   `.env.example` shows the expected shape. The real values are provided by the project owner (they connect the app to the shared dev backend).

3. Start the app:

   ```bash
   npx expo start
   ```

   - Scan the QR code with Expo Go (Android: in-app scanner, iOS: Camera app), or
   - press `a` for Android emulator / `i` for iOS simulator.

## Test accounts

The owner provides test accounts for each role (customer, barber, shop owner). Note that `admin` access is granted only directly in the database, so just ask if you need it.

## Running your own backend (optional)

If you prefer not to use the shared dev backend:

1. Create a free project at [supabase.com](https://supabase.com), then:

   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push          # applies supabase/migrations/
   npx supabase db reset         # optional: local run incl. supabase/seed.sql demo data
   ```

2. Deploy the Clerk webhook Edge Function:

   ```bash
   npx supabase functions deploy clerk-webhook
   npx supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CLERK_WEBHOOK_SECRET=...
   ```

3. Create an app at [clerk.com](https://clerk.com), point its webhook at your function URL, and put its publishable key plus your Supabase URL / publishable key into `.env`.

## Project structure

```
app/            Routes grouped by role: customer/ barber/ owner/ admin/ + (auth)/ onboarding
components/ui/  Shared design system (Screen, Button, TextField, sheets, badges, ...)
components/tab-bar/  Custom floating tab bar
lib/            Data loaders, RPC wrappers, hooks, auth/role sync, theme tokens
supabase/       schema.sql, migrations/, seed.sql, functions/clerk-webhook/
```

All business rules (bookings lifecycle, loyalty/rewards, reputation, invitations) live in the database as SECURITY DEFINER RPCs and triggers — the client only requests actions.
