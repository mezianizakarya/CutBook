# Customer Map Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   Interactive Map    │    │
│  │   (OpenFreeMap       │    │
│  │    Liberty tiles)    │    │
│  │                     │    │
│  │   ● ●   ●          │    │
│  │     ●    ●          │    │
│  │   (shop pins)       │    │
│  │                     │    │
│  │                     │    │
│  │                     │    │
│  │  ┌─────────────────┐│    │
│  │  │ [👤] Barber  ▸ ││    │
│  │  │ 0.5 km · ★ 4.8 ││    │
│  │  │ From 150.00 DA  ││    │
│  │  └─────────────────┘│    │
│  │  (selected shop card)│   │
│  └─────────────────────┘    │
│                             │
│  (tabs: Home|Discover|Map|  │
│   Bookings|Favorites|Profile)│
└─────────────────────────────┘
```

- Tab screen, no back button
- Full-screen native MapLibre map (OpenFreeMap Liberty tiles)
- Shop pins loaded from `nearby_shops` RPC (region-filtered)
- Pin tap → shop card appears at bottom with name, distance, rating, price
- Card tap → `/customer/shop/[id]`
- Map tap (empty area) → dismisses selected shop card
- Loading badge at top while fetching
- Empty state badge when no shops nearby
- Content extends behind floating tab bar (no bottom padding)
