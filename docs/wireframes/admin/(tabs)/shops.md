# Admin Shops Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Shops                      │
│  (24/700)                   │
│  15 shops                   │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔍 Search shops     │    │
│  │                 [X] │    │
│  └─────────────────────┘    │
│  (h=48, pill, surface bg)   │
│                             │
│  (All)(Pending)(Approved)   │
│  (Suspended)                │
│  ~~~status filter chips~~~  │
│  (active=primary bg+white)  │
│                             │
│  (All 15)(MA)(US)(FR)       │
│  ~~~region filter chips~~~  │
│                             │
│  [📷] Barber Milano         │
│      Casablanca, MA · Aug 1 │
│                     Approved│
│  ═══════════════════════    │
│  [📷] Style Studio          │
│      Rabat, MA · Aug 15     │
│                     Pending │
│  ═══════════════════════    │
│  [📷] The Fade Room         │
│      Fes, MA · Aug 10       │
│                     Approved│
│                             │
│  ── Shop Admin Sheet ────── │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │  [📷] Barber Milano │    │
│  │  ★ 4.7 · Verified   │    │
│  │  Casablanca · Aug 1 │    │
│  │                     │    │
│  │  [  Approve   ]     │    │
│  │  [ Suspend    ]     │    │
│  │  [ Reactivate ]     │    │
│  │  [  Verify    ]     │    │
│  │                     │    │
│  │  [     Close     ]  │    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs: Dashboard|Shops     │
│   |Users|Settings)          │
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + search
- Status filter chips: All, Pending, Approved, Suspended
- Region filter chips: All (count), then per-region (count) — dynamically computed from loaded shops
- Shop row subtitle shows city + country code
- Row tap → ShopAdminSheet (bottom-sheet)
- Actions: Approve, Suspend, Reactivate, Verify
