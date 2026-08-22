# Barber Dashboard Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Good morning,              │
│  Youssef                    │
│  Tuesday, August 18         │
│                             │
│  Barber Milano     (Leave)  │
│  🟢 Available today         │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │  8  │ │  2  │ │  5  │ │ 1200││
│  │Today│ │Pend-│ │Comp-│ │Rev- ││
│  │     │ │ing  │ │leted│ │enue ││
│  └─────┘ └─────┘ └─────┘ └─────┘│
│  (4x StatCards)              │
│                             │
│  Today's schedule           │
│                             │
│  8 appointments · Serving   │
│  Youssef now                │
│                             │
│  [ Continue Work Session ]  │
│  (primary)                  │
│                             │
│  ╭─────────────────────╮    │
│  │ [👤] Fade           │    │
│  │     Youssef B.      │    │
│  │     2:00 PM · 150MAD│    │
│  │     ● Now serving   │    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Taper          │    │
│  │     Ahmed L.        │    │
│  │     2:30 PM · 120MAD│    │
│  │     ○ Waiting       │    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Haircut        │    │
│  │     Karim A.        │    │
│  │     3:00 PM · 100MAD│    │
│  │     ○ Waiting       │    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs: Dashboard|Schedule  │
│   |Clients|Profile)         │
└─────────────────────────────┘
```

- Tab screen, no back button
- ScrollView with pull-to-refresh
- Continue Work Session → `/barber/work-session`
- Booking cards → StaffBookingSheet (bottom sheet)
- Empty state: "Not assigned to a shop" + "Join a shop"
