# Settings Screen

```
┌─────────────────────────────┐
│ ←  Settings                 │
│                             │
│  Manage your account and    │
│  app preferences.           │
│  (13, muted)                │
│                             │
│  ╭─────────────────────╮    │
│  │ Edit profile      ▸ │    │
│  │ ═══════════════════  │   │
│  │ Account info      ▸ │    │
│  │ ═══════════════════  │   │
│  │ Account region    ▸ │    │
│  │ ═══════════════════  │   │
│  │ Request verif.    ▸ │    │
│  ╰─────────────────────╯    │
│  (settings group card)      │
│                             │
│  ╭─────────────────────╮    │
│  │     Sign Out        │    │
│  ╰─────────────────────╯    │
│                             │
│  ╭─────────────────────╮    │
│  │   Delete Account    │    │
│  ╰─────────────────────╯    │
│  (danger)                   │
│                             │
└─────────────────────────────┘
```

Tap "Account region" opens a bottom sheet:

```
┌─────────────────────────────┐
│                             │
│         ─── drag ───        │
│                             │
│  Account region             │
│                             │
│  ╭─────────────────────╮    │
│  │ 📍 Country           │   │
│  │ 🇲🇦 Morocco           │   │
│  │ ═══════════════════  │   │
│  │ 💵 Currency          │   │
│  │ MAD (MAD)            │   │
│  ╰─────────────────────╯    │
│                             │
│  Your region is auto-       │
│  matically detected based   │
│  on your device location    │
│  and cannot be changed      │
│  manually. All prices in    │
│  the app are displayed in   │
│  your local currency.       │
│                             │
│  ╭─────────────────────╮    │
│  │        Done         │    │
│  ╰─────────────────────╯    │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Edit profile → `/edit-profile`
- Account info → `/account-info`
- Account region → opens info bottom sheet (pan-to-dismiss, drag handle, info card with country + currency, Done button)
- Request verification → `/verification` (hidden for admin)
- SignOutButton component
- DeleteAccountButton component
