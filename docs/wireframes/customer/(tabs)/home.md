# Customer Home Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Good morning,              │
│  Youssef 👋          [👤]   │
│  (24/700)          (40 avatar)│
│                             │
│  📍 Set your location  ▸    │
│  (13, muted)                │
│                             │
│  🔍 Search barbers, shops,  │
│     or services             │
│  (pill, 54h, radius.full)   │
│                             │
│  ~~Upcoming Booking~~       │
│  ╭─────────────────────╮    │
│  │ 📅 Upcoming Appt    │    │
│  │ [👤] Fade · Barber  │    │
│  │     Milano          │    │
│  │     Aug 18, 2:00 PM │    │
│  │              Confirmed│   │
│  ╰─────────────────────╯    │
│  (conditional)              │
│                             │
│  Browse by service          │
│  (haircut)(beard)(fade)     │
│  (styling)(kids)(more)      │
│  ~~~horizontal scroll~~~    │
│  (6 circular icon chips)    │
│                             │
│  Your loyalty cards  See all│
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Card │ │Card │ │Card │   │
│  │ 3/5 │ │ 8/10│ │ 1/3 │   │
│  └─────┘ └─────┘ └─────┘   │
│  ~~~horizontal scroll~~~    │
│                             │
│  Nearby barbers      See all│
│  ┌─────────────────────┐    │
│  │ [img 130h]          │    │
│  │ Ahmed ★ 4.8 (23)    │    │
│  │ Fades · Casablanca  │    │
│  ╰─────────────────────╯    │
│  ~~~horizontal scroll~~~    │
│                             │
│  Available today     See all│
│  [👤] Ahmed Benali    2:00  │
│  [👤] Karim Alaoui    3:30  │
│                             │
│  Book again          See all│
│  [👤] Barber Milano         │
│      Fade · Book again      │
│  [👤] Style Studio          │
│      Taper · Book again     │
│                             │
│  (tabs behind: Home|Discover|Map│
│   |Bookings|Favorites|Profile)  │
└─────────────────────────────┘
```

- Tab screen, no back button
- Content extends behind floating tab bar (no bottom padding)
- Pull-to-refresh
- Avatar → `/customer/profile`
- Search bar → `/customer/discover`
- Service chips → `/customer/discover`
- Shop cards → `/customer/shop/[id]`
- Upcoming card → Bookings tab
- Loyalty cards → `/customer/shop/[id]`
