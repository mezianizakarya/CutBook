# Barber Clients Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Clients                    │
│  (24/700)                   │
│  15 clients                 │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔍 Search clients   │    │
│  │                 [X] │    │
│  └─────────────────────┘    │
│  (h=48, pill, surface bg)   │
│                             │
│  [👤] Youssef Benali        │
│      5 visits · Fades       │
│      Last: Aug 18     2 up  │
│  ═══════════════════════    │
│  [👤] Ahmed Lakrim          │
│      3 visits · Taper       │
│      Last: Aug 15           │
│  ═══════════════════════    │
│  [👤] Karim Alaoui          │
│      8 visits · Beard       │
│      Last: Aug 12     1 up  │
│  ═══════════════════════    │
│                             │
│  ── Client Detail Sheet ──  │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │      [👤 56px]      │    │
│  │    Youssef Benali   │    │
│  │   +212 6XX XXX XXX  │    │
│  │   y@...             │    │
│  │                     │    │
│  │  ┌─────┐ ┌─────┐ ┌─────┐│
│  │  │  12 │ │  10 │ │  2  ││
│  │  │Book-│ │Comp-│ │Upco-││
│  │  │ings │ │leted│ │ming ││
│  │  └─────┘ └─────┘ └─────┘│
│  │                     │    │
│  │  Phone   +212 6XX   │    │
│  │  Email   y@...      │    │
│  │  Favorite  Fades    │    │
│  │  Last visit  Aug 18 │    │
│  │                     │    │
│  │  Recent bookings    │    │
│  │  Fade · Aug 18 150MAD│   │
│  │  Taper · Aug 10 120MAD│  │
│  │                     │    │
│  │  [     Close     ]  │    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs: Dashboard|Schedule  │
│   |Clients|Profile)         │
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + search
- Row tap → Client detail sheet (bottom-sheet modal)
- Search filters by name
