# Admin Pending Verifications Screen

```
┌─────────────────────────────┐
│ ←  Verification requests    │
│                             │
│  Barbers and shop owners    │
│  who asked to be verified.  │
│  (13, muted)                │
│                             │
│  Requests              2    │
│  waiting                   │
│                             │
│  [👤] Youssef Benali        │
│      Barber · Aug 18        │
│      "I've been cutting     │
│       hair for 5 years"     │
│              [ Approve ]    │
│              (greenOutline) │
│  ═══════════════════════    │
│  [👤] Ahmed Lakrim          │
│      Shop Owner · Aug 17    │
│      "My shop has been      │
│       open for 3 years"     │
│              [ Approve ]    │
│              (greenOutline) │
│                             │
│  ╭─────────────────────╮    │
│  │ Nothing to review   │    │
│  │ No verification     │    │
│  │ requests are        │    │
│  │ waiting right now.  │    │
│  ╰─────────────────────╯    │
│  (empty state)              │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Pull-to-refresh
- Row: Avatar 44 + name + role · date + note (2 lines max) + Approve button
- Approve removes from list + success notice
