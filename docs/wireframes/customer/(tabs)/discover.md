# Customer Discover Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Discover                   │
│  (24/700)                   │
│  12 barbers · 5 cities      │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔍 Search barber or │    │
│  │    shop         [X] │    │
│  └─────────────────────┘    │
│  (h=48, pill, surface bg)   │
│                             │
│  (All)(12)(Casa)(5)(Rabat)  │
│  ~~~city filter chips~~~    │
│  (active=primary bg+white)  │
│                             │
│  (Top rated)(Newest)        │
│  ~~~sort chips~~~           │
│                             │
│  [👤] Ahmed Benali   ★ 4.8  │
│      Fades · Casablanca     │
│  ═══════════════════════    │
│  [👤] Youssef B.     ★ 4.6  │
│      Haircuts · Rabat       │
│  ═══════════════════════    │
│  [👤] Karim Alaoui   ★ 4.9  │
│      Beard work · Casablanca│
│  ═══════════════════════    │
│  [👤] Sami T.        ★ 4.5  │
│      Kids cuts · Fes        │
│                             │
│  Load more / spinner        │
│                             │
│  (tabs behind: Home|Discover│
│   |Favorites|Bookings|Profile)│
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + pagination
- Empty state: "No barbers found" + "Reset filters"
- Row tap → `/customer/barber/[profileId]`
