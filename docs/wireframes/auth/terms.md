# Terms of Service Screen (`/terms`)

```
┌─────────────────────────────┐
│ ╭───╮                       │
│ │ ← │  Terms of Service     │
│ ╰───╯  (24/800)             │
│                             │
│  Last updated: August 2026  │
│  (12, muted)                │
│                             │
│  Intro paragraph            │
│  (15/22, text)              │
│                             │
│  Accounts                   │
│  (16/700)                   │
│  Body copy… (14/21, muted)  │
│                             │
│  Bookings & Cancellations   │
│  Body copy…                 │
│                             │
│  Loyalty & Rewards          │
│  Body copy…                 │
│                             │
│  Shops & Services           │
│  Body copy…                 │
│ ~~~ scrollable ~~~          │
│                             │
│  Region                     │
│  Acceptable Use             │
│  Changes & Contact          │
└─────────────────────────────┘
```

- `Screen scroll`
- Back button (36×36 pill, surface bg, border) → `router.back()` (same pattern as onboarding header)
- Sections rendered from a static `[titleKey, bodyKey]` list — all strings from `legal.*` i18n keys (en/fr/ar)
- Reached from Welcome legal footer ("Terms of Service" link)
