# Customer Shop Detail Screen

```
┌─────────────────────────────┐
│ ←  Shop                     │
│                             │
│  ┌─────────────────────┐    │
│  │   Hero image        │    │
│  │   (200h, carousel)  │    │
│  │              1/3    │    │
│  └─────────────────────┘    │
│                             │
│  Barber Milano       [♡]   │
│  (18/700)      (heart toggle)│
│  ★ 4.7 (23) · 📍 Casablanca│
│                             │
│  🟢 Open · closes 8 PM     │
│                             │
│  Best barbershop in town... │
│  (description, 14, muted)   │
│                             │
│  Details                    │
│  ╭─────────────────────╮    │
│  │ 📍 Address    123 St│   │
│  │ 📞 Phone    +212... │    │
│  │ ✉ Email     @...    │    │
│  │ 🌐 Website   ...    │    │
│  ╰─────────────────────╯    │
│                             │
│  ┌─────────────────────┐    │
│  │   Interactive Map    │    │
│  │   (shop location     │    │
│  │    with pin marker)  │    │
│  │   180h, rounded      │    │
│  └─────────────────────┘    │
│                             │
│  Hours                      │
│  ╭─────────────────────╮    │
│  │ Mon      9:00 - 18:00│   │
│  │ Tue      9:00 - 18:00│   │
│  │ Wed      9:00 - 18:00│   │
│  │ Thu      9:00 - 18:00│   │
│  │ Fri      9:00 - 18:00│   │
│  │ Sat     10:00 - 16:00│   │
│  │ Sun       Closed     │   │
│  ╰─────────────────────╯    │
│  (today row bold/primary)   │
│                             │
│  Services                   │
│  ── Haircuts ────────────── │
│  ╭─────────────────────╮    │
│  │ Fade    30 min  150 │    │
│  │ Taper    25 min  120│    │
│  ╰─────────────────────╯    │
│  ── Beard ────────────────  │
│  ╭─────────────────────╮    │
│  │ Trim    15 min   80 │    │
│  ╰─────────────────────╯    │
│                             │
│  Barbers                    │
│  ╭─────────────────────╮    │
│  │ [👤] Youssef B.    ▸│   │
│  │      Fades · 5 yrs  │    │
│  │ ═══════════════════  │   │
│  │ [👤] Ahmed L.      ▸│   │
│  │      Beard · 3 yrs  │    │
│  ╰─────────────────────╯    │
│                             │
│  ── Loyalty Card ─────────  │
│  (ShopLoyaltyCard)          │
│                             │
│  Reviews                    │
│  ╭─────────────────────╮    │
│  │     4.7             │    │
│  │   ★ ★ ★ ★ ☆        │    │
│  │   23 reviews        │    │
│  │   ┌───────────────┐ │    │
│  │   │ 5 ★ ████████  │ │    │
│  │   │ 4 ★ ██████    │ │    │
│  │   │ 3 ★ ██        │ │    │
│  │   │ 2 ★ █         │ │    │
│  │   │ 1 ★           │ │    │
│  │   └───────────────┘ │    │
│  ╰─────────────────────╯    │
│                             │
│  [ Leave a review ]         │
│                             │
│  ╭─────────────────────╮    │
│  │     Book Now        │    │
│  ╰─────────────────────╯    │
│  (primary, sticky bottom)   │
│                             │
│  ── Booking Modal ──────── │
│  (slides up on Book Now)    │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Hero image carousel with dot indicators
- Heart/favorite toggle
- Barber rows → `/customer/barber/[profileId]`
- Book Now → BookingModal → on success → `/customer/bookings`
