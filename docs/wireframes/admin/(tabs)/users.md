# Admin Users Screen (Tab)

```
┌─────────────────────────────┐
│                             │
│  Users                      │
│  (24/700)                   │
│  142 active · 8 deleted     │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔍 Search users     │    │
│  │                 [X] │    │
│  └─────────────────────┘    │
│  (h=48, pill, surface bg)   │
│                             │
│  (All 150)(Active 142)      │
│  (Deleted 8)                │
│  ~~~status filter chips~~~  │
│                             │
│  (All)(Customer 120)        │
│  (Barber 12)(Owner 8)(Admin 2)│
│  ~~~role filter chips~~~    │
│                             │
│  (All 150)(MA)(US)(FR)      │
│  ~~~region filter chips~~~  │
│                             │
│  [👤] Ahmed Lakrim   @ahmed │
│      ✓ Barber     Active   │
│  ═══════════════════════    │
│  [👤] Karim Alaoui   @karim │
│      ✓ Barber     Active   │
│  ═══════════════════════    │
│  [👤] Sami Touati    @sami  │
│      Owner      Deleted    │
│                             │
│  ── User Detail Sheet ──── │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │  [👤 48] Ahmed L. ✓ │    │
│  │  (barber)  Active   │    │
│  │  @ahmed             │    │
│  │                     │    │
│  │  Username  @ahmed [Copy]│
│  │  Email     a@.. [Copy] │
│  │  Phone     +212..[Copy]│
│  │  Member    Aug 1     │    │
│  │  Last act  Aug 18    │    │
│  │  Region    🇲🇦 Morocco │  │
│  │                     │    │
│  │  [ Delete account  ] │    │
│  │  (dangerOutline)    │    │
│  │                     │    │
│  │  [     Close     ]  │    │
│  ╰─────────────────────╯    │
│                             │
│  ── Role Picker ────────── │
│  (Customer)(Barber)(Owner)  │
│  (Admin)                    │
│  [ Change role to X ]       │
│                             │
│  ── Verification ───────── │
│  [ Remove verification ]    │
│  (danger)                   │
│                             │
│  (tabs: Dashboard|Shops     │
│   |Users|Settings)          │
└─────────────────────────────┘
```

- Tab screen, no back button
- FlatList with pull-to-refresh + search + pagination
- Status filter: All, Active, Deleted
- Role filter: All, Customer, Barber, Owner, Admin
- Region filter: All (count), then per-region (count) — dynamically computed from loaded profiles
- Row tap → User detail sheet (bottom-sheet)
- Detail card shows Region row with flag + country name (when set)
- Actions: Change role, Delete/Restore account, Remove verification
- Copy feedback: "Copy" → "Copied" for 1.5s
- Delete uses double-press confirm (5s countdown)
