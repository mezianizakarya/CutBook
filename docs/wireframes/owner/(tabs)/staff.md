# Owner Staff Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Staff                      │
│  (24/700)                   │
│  Invite barbers with        │
│  one-time codes and manage  │
│  your team.                 │
│  (13, muted)                │
│                             │
│  (All shops)(Barber Milano) │
│  ~~~shop filter chips~~~    │
│                             │
│  Invitations                │
│  ╭─────────────────────╮    │
│  │ ABCD1234            │    │
│  │ Barber Milano       │    │
│  │ Active         [Copy]│   │
│  │              [Revoke]│   │
│  ╰─────────────────────╯    │
│  ╭─────────────────────╮    │
│  │ XYZ9876             │    │
│  │ Barber Milano       │    │
│  │ Used           ──── │    │
│  ╰─────────────────────╯    │
│                             │
│  [   Invite barber   ]      │
│  (outline)                  │
│                             │
│  Staff                      │
│  [👤] Youssef Benali        │
│      Barber · Barber Milano │
│                        ▸    │
│  ═══════════════════════    │
│  [👤] Ahmed Lakrim          │
│      Barber · Barber Milano │
│                        ▸    │
│                             │
│  ── Staff Detail Sheet ──  │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │      [👤 52px]      │    │
│  │    Youssef Benali   │    │
│  │    Barber           │    │
│  │    Joined: Aug 1    │    │
│  │                     │    │
│  │  [ Remove from shop ]│   │
│  │  (dangerOutline)    │    │
│  ╰─────────────────────╯    │
│                             │
│  (tabs: Dashboard|Shop      │
│   |Bookings|Staff|Profile)  │
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh
- Shop filter chips (if >1 shop)
- Invitation rows with Copy/Revoke actions
- Staff rows → Staff detail sheet
- Remove from shop: dangerOutline button
