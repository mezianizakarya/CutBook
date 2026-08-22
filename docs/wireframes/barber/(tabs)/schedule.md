# Barber Schedule Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Schedule                   │
│  (24/700)                   │
│  Barber Milano              │
│  Tuesday, August 18         │
│                             │
│  ( S )( M )( T )( W )( T )( F )( S )│
│  ( 12)( 13)( 14)( 15)( 16)( 17)[18]│
│  ~~~horizontal week strip~~~│
│  (today = outlined pill)    │
│                             │
│  🟢 Available today         │
│                             │
│  [ Mark as day off ]        │
│  (dangerOutline, conditional)│
│                             │
│  5 bookings                 │
│                             │
│  ╭─────────────────────╮    │
│  │ [👤] Fade           │    │
│  │     Youssef B.      │    │
│  │     2:00 PM · 150MAD│    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Taper          │    │
│  │     Ahmed L.        │    │
│  │     2:30 PM · 120MAD│    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Haircut        │    │
│  │     Karim A.        │    │
│  │     3:00 PM · 100MAD│    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs: Dashboard|Schedule  │
│   |Clients|Profile)         │
└─────────────────────────────┘
```

- Tab screen, no back button
- ScrollView with pull-to-refresh
- Week strip: 7 day pills (S M T W T F S)
- Availability pill for selected day
- Mark/remove day off buttons (conditional)
- Booking cards → StaffBookingSheet
