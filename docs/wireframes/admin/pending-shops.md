# Admin Pending Shops Screen

```
┌─────────────────────────────┐
│ ←  Pending approvals        │
│                             │
│  Shops waiting for your     │
│  approval.                  │
│  (13, muted)                │
│                             │
│  Shops                 3    │
│  waiting                   │
│                             │
│  [📷] Style Studio          │
│      No city · Aug 15       │
│              [ Approve ]    │
│              (greenOutline) │
│  ═══════════════════════    │
│  [📷] The Fade Room         │
│      Fes · Aug 12           │
│              [ Approve ]    │
│              (greenOutline) │
│  ═══════════════════════    │
│  [📷] New Barbershop        │
│      Rabat · Aug 10         │
│              [ Approve ]    │
│              (greenOutline) │
│                             │
│  ╭─────────────────────╮    │
│  │ Nothing to review   │    │
│  │ No shops are        │    │
│  │ waiting for         │    │
│  │ approval right now. │    │
│  ╰─────────────────────╯    │
│  (empty state)              │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Pull-to-refresh
- Row: Avatar 44 (shop logo) + name + city · date + Approve button
- Row tap → ShopAdminSheet (bottom-sheet)
- Approve removes from list + success notice
