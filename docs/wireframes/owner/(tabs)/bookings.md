# Owner Bookings Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Bookings                   │
│  (24/700)                   │
│  All appointments across    │
│  your shops.                │
│  (13, muted)                │
│                             │
│  (All 12)(Pending 3)(Confirm│
│   ed 5)(Completed 3)(Cancel │
│   led 1)(No-show 0)        │
│  ~~~filter chips~~~         │
│  (active=primary bg+white)  │
│                             │
│  ╭─────────────────────╮    │
│  │ [👤] Fade           │    │
│  │     Youssef B.      │    │
│  │     Barber Milano   │    │
│  │     2:00 PM · 150MAD│    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Taper          │    │
│  │     Ahmed L.        │    │
│  │     Style Studio    │    │
│  │     2:30 PM · 120MAD│    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Haircut        │    │
│  │     Karim A.        │    │
│  │     Barber Milano   │    │
│  │     3:00 PM · 100MAD│    │
│  ╰─────────────────────╯    │
│                             │
│  Load more / spinner        │
│                             │
│  (tabs: Dashboard|Shop      │
│   |Bookings|Staff|Profile)  │
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + pagination
- Status filter chips
- Card tap → StaffBookingSheet
