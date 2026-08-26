# Privacy Policy Screen (`/privacy`)

```
┌─────────────────────────────┐
│ ╭───╮                       │
│ │ ← │  Privacy Policy       │
│ ╰───╯  (24/800)             │
│                             │
│  Last updated: August 2026  │
│  (12, muted)                │
│                             │
│  Intro paragraph            │
│  (15/22, text)              │
│                             │
│  Data We Collect            │
│  (16/700)                   │
│  Body copy… (14/21, muted)  │
│                             │
│  How We Use It              │
│  Body copy…                 │
│                             │
│  Location                   │
│  Body copy…                 │
│ ~~~ scrollable ~~~          │
│                             │
│  Sharing                    │
│  Retention & Deletion       │
│  Your Rights & Contact      │
└─────────────────────────────┘
```

- `Screen scroll`
- Back button (36×36 pill, surface bg, border) → `router.back()` (same pattern as onboarding header)
- Sections rendered from a static `[titleKey, bodyKey]` list — all strings from `legal.*` i18n keys (en/fr/ar)
- Reached from Welcome legal footer ("Privacy Policy" link)
