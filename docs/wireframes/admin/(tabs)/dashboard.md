# Admin Dashboard Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Dashboard                  │
│  (24/700)                   │
│  Tuesday, August 18         │
│  (13, muted)                │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │ 150 │ │  12 │ │   8 │ │  15 ││
│  │User-│ │Barb-│ │Own- │ │Shop-││
│  │s    │ │ers  │ │ers  │ │s    ││
│  └─────┘ └─────┘ └─────┘ └─────┘│
│  (4x StatCards)              │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │  3  │ │  8  │ │4500 │   │
│  │Pend-│ │Today│ │Rev- │   │
│  │ing  │ │     │ │enue │   │
│  └─────┘ └─────┘ └─────┘   │
│  (3x StatCards)              │
│                             │
│  ╭─────────────────────╮    │
│  │ Pending approvals   ▸│   │
│  │ Shops waiting for   │    │
│  │ your approval.    (3)│   │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ Barber verification ▸│   │
│  │ Barbers who asked   │    │
│  │ to be verified.   (2)│   │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ Shop verification   ▸│   │
│  │ Shops that asked    │    │
│  │ to verify.        (1)│   │
│  ╰─────────────────────╯    │
│                             │
│  Recent signups             │
│  [👤] Ahmed L.    @ahmed    │
│      Barber         (barber)│
│  ═══════════════════════    │
│  [👤] Karim A.    @karim    │
│      Customer    (customer) │
│  ═══════════════════════    │
│  [👤] Sami T.     @sami     │
│      Owner         (owner)  │
│                             │
│  (tabs: Dashboard|Shops     │
│   |Users|Settings)          │
└─────────────────────────────┘
```

- Tab screen, no back button
- ScrollView with pull-to-refresh
- Stats row 1: Users, Barbers, Owners, Shops
- Stats row 2: Pending, Today, Revenue
- Review cards → pending pages
- Recent signups: up to 6 user rows
- Badge colors: Approved=#dcfce7, Pending=#fef3c7, Suspended=#fee2e2
