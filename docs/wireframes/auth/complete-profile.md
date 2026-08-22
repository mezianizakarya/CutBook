# Complete Profile Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Complete your profile      │
│  (28/800)                   │
│                             │
│  A few details so barbers   │
│  and shops know who you     │
│  are.                       │
│  (15, muted)                │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ First    │ │ Last     │  │
│  │ name     │ │ name     │  │
│  └──────────┘ └──────────┘  │
│  (2x TextFields, row)       │
│                             │
│  ┌─────────────────────┐    │
│  │ @ username          │    │
│  └─────────────────────┘    │
│  (UsernameField)            │
│                             │
│  ┌─────────────────────┐    │
│  │ 🌍 +1  |  555-1234  │   │
│  └─────────────────────┘    │
│  (PhoneInput)               │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │       Finish        │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen, paddingHorizontal=14
- No back button
- UsernameField with availability checking
- On success → role-based routing:
  - barber → `/onboarding/barber-professional`
  - owner → `/onboarding/owner-shop?from=signup`
  - customer → `/loading`
