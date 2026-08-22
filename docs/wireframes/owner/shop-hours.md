# Owner Shop Hours Screen

```
┌─────────────────────────────┐
│ ←  Working hours            │
│                             │
│  Set when your shop is open │
│  for appointments.          │
│  (13, muted)                │
│                             │
│  [ Apply to multiple days ] │
│  (outline)                  │
│                             │
│  ╭─────────────────────╮    │
│  │ Monday    9:00-18:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Tuesday   9:00-18:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Wednesday 9:00-18:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Thursday  9:00-18:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Friday    9:00-18:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Saturday 10:00-16:00│    │
│  │           [====] ON │    │
│  │ ═══════════════════  │   │
│  │ Sunday     Closed   │    │
│  │           [----] OFF│    │
│  ╰─────────────────────╯    │
│                             │
│  (today row bold/primary)   │
│                             │
│  ╭─────────────────────╮    │
│  │ ⚠ 2 bookings fall   │    │
│  │ outside new hours   │    │
│  │ Saving won't move   │    │
│  │ or cancel them      │    │
│  ╰─────────────────────╯    │
│  (conflict card, conditional)│
│                             │
│  [      Save hours      ]   │
│  (primary)                  │
│                             │
│  ── Apply Hours Sheet ──── │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │  Copy from          │    │
│  │  (Mon)(Tue)(Wed)... │    │
│  │                     │    │
│  │  Apply to           │    │
│  │  (Mon)(Tue)(Wed)... │    │
│  │                     │    │
│  │  Preview: 9:00-18:00│   │
│  │                     │    │
│  │  [ Apply to N days ] │    │
│  ╰─────────────────────╯    │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Day rows with open/close time pressables + Switch toggle
- Conflict detection against upcoming bookings
- Apply to multiple days → bottom-sheet with source/target day chips
