# Admin Pending Shop Verifications Screen

```
┌─────────────────────────────┐
│ ←  Shop verification        │
│                             │
│  Shop owners who asked to   │
│  verify their business.     │
│  (13, muted)                │
│                             │
│  Requests              2    │
│  waiting                   │
│                             │
│  [📷] Barber Milano         │
│      Casablanca · Aug 18    │
│      Requested by Youssef B.│
│      "We've been open for   │
│       3 years with great    │
│       reviews"              │
│              [ Approve ]    │
│              (greenOutline) │
│  ═══════════════════════    │
│  [📷] Style Studio          │
│      Rabat · Aug 15         │
│      Requested by Ahmed L.  │
│      "Top rated shop in     │
│       the city"             │
│              [ Approve ]    │
│              (greenOutline) │
│                             │
│  ╭─────────────────────╮    │
│  │ Nothing to review   │    │
│  │ No shop verification│    │
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
- Row: Avatar 44 (shop logo) + name + city · date + "Requested by {owner}" (12px muted) + note (2 lines max) + Approve button
- Approve removes from list + success notice
