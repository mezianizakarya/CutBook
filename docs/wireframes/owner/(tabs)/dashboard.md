# Owner Dashboard Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Good morning,              │
│  Youssef                    │
│  Tuesday, August 18         │
│                             │
│  Barber Milano              │
│                             │
│  ╭─────────────────────╮    │
│  │ ⏳ Pending approval  │   │
│  │ Your shop is waiting │   │
│  │ for admin approval.  │   │
│  ╰─────────────────────╯    │
│  (NoticeBanner, conditional)│
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │  8  │ │  2  │ │  5  │ │ 1500││
│  │Today│ │Pend-│ │Comp-│ │Rev- ││
│  │     │ │ing  │ │leted│ │enue ││
│  └─────┘ └─────┘ └─────┘ └─────┘│
│  (4x StatCards)              │
│                             │
│  Today's schedule           │
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
│                             │
│  (tabs: Dashboard|Shop      │
│   |Bookings|Staff|Profile)  │
└─────────────────────────────┘
```

- Tab screen, no back button
- ScrollView with pull-to-refresh
- NoticeBanner for pending shop approval (conditional)
- Empty state: "You don't manage a shop yet" + "Create your first shop"
- Booking cards → StaffBookingSheet
