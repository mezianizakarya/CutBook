# Customer Bookings Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Bookings                   │
│  (24/700)                   │
│  2 upcoming · 5 past        │
│  (13, muted)                │
│                             │
│  (All 7)(Upcoming 2)(Past 5)│
│  ~~~filter chips~~~         │
│  (active=primary bg+white)  │
│                             │
│  ╭─────────────────────╮    │
│  │ [👤] Fade           │    │
│  │     Barber Milano   │    │
│  │     Aug 18, 2:00 PM │    │
│  │     Pending         │    │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ [👤] Taper          │    │
│  │     Style Studio    │    │
│  │     Aug 20, 4:30 PM │    │
│  │     Confirmed       │    │
│  ╰─────────────────────╯    │
│                             │
│  Load more / spinner        │
│                             │
│  ── Booking Detail Sheet ── │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │  [👤] Fade          │    │
│  │  Confirmed          │    │
│  │                     │    │
│  │  When: Aug 18 2:00  │    │
│  │  Barber: Youssef B. │    │
│  │  Shop: Barber Milano│    │
│  │  Price: 150 MAD     │    │
│  │  Note: keep back    │    │
│  │      longer         │    │
│  │                     │    │
│  │  ● You're being     │    │
│  │    served now       │    │
│  │  18:42 remaining    │    │
│  │                     │    │
│  │  [ Cancel booking ] │    │
│  │  (double-press 5s)  │    │
│  │                     │    │
│  │  [     Close     ]  │    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs behind: Home|Discover│
│   |Favorites|Bookings|Profile)│
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + pagination
- Empty state: "No bookings yet" + "Discover shops"
- Card tap → BookingDetailSheet (bottom-sheet modal)
- Live progress card for pending/confirmed
- Review section for completed bookings
