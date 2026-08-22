# Owner Shop Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Shop                       │
│  (24/700)                   │
│  Pending approval...        │
│  (13, muted)                │
│                             │
│  (Barber Milano)(+ add)     │
│  ~~~shop filter chips~~~    │
│                             │
│  Details                    │
│  ╭─────────────────────╮    │
│  │ Name     Barber Milan│   │
│  │ ═══════════════════  │   │
│  │ Desc     Best in... │    │
│  │ ═══════════════════  │   │
│  │ Address  123 St     │    │
│  │ ═══════════════════  │   │
│  │ City     Casablanca │    │
│  │ ═══════════════════  │   │
│  │ Phone    +212...    │    │
│  ╰─────────────────────╯    │
│                             │
│  Services            Edit ▸ │
│  ╭─────────────────────╮    │
│  │ Fade    150MAD 30min │   │
│  │          [====]     │    │
│  │ Taper   120MAD 25min│    │
│  │          [====]     │    │
│  ╰─────────────────────╯    │
│  (Switch toggles for owner) │
│                             │
│  Working hours        Edit ▸│
│  ╭─────────────────────╮    │
│  │ Mon   9:00 - 18:00  │   │
│  │ Tue   9:00 - 18:00  │   │
│  │ Wed   9:00 - 18:00  │   │
│  │ Thu   9:00 - 18:00  │   │
│  │ Fri   9:00 - 18:00  │   │
│  │ Sat  10:00 - 16:00  │   │
│  │ Sun      Closed     │    │
│  ╰─────────────────────╯    │
│                             │
│  ── Loyalty Program ─────── │
│  (OwnerLoyaltySection)      │
│                             │
│  Verification               │
│  ╭─────────────────────╮    │
│  │ 🏆 Verified badge   ▸│   │
│  ╰─────────────────────╯    │
│                             │
│  ── Danger Zone ──────────  │
│  ╭─────────────────────╮    │
│  │   Delete shop       │    │
│  ╰─────────────────────╯    │
│  (danger, double-press)     │
│                             │
│  (tabs: Dashboard|Shop      │
│   |Bookings|Staff|Profile)  │
└─────────────────────────────┘
```

- Tab screen, no back button
- ScrollView with pull-to-refresh
- Multi-shop chip selector
- Services → `/owner/shop-services`
- Working hours → `/owner/shop-hours`
- Verification → `/owner/shop-verification`
- Delete shop: double-press confirm (5s countdown)
