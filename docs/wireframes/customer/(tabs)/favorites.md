# Customer Favorites Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Favorites                  │
│  (24/700)                   │
│  3 saved shops              │
│  (13, muted)                │
│                             │
│  [📷] Barber Milano         │
│       ★ 4.7 · Casablanca   │
│                        ♡    │
│  ═══════════════════════    │
│  [📷] Style Studio          │
│       ★ 4.5 · Rabat        │
│                        ♡    │
│  ═══════════════════════    │
│  [📷] The Fade Room         │
│       ★ 4.8 · Fes          │
│                        ♡    │
│                             │
│  (tabs behind: Home|Discover│
│   |Favorites|Bookings|Profile)│
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh
- Row: image/logo 44 + name + verified + city + star + heart button
- Empty state: "No favorites yet" + "Discover shops" → `/customer/discover`
- Row tap → `/customer/shop/[id]`
