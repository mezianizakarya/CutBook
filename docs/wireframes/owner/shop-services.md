# Owner Shop Services Screen

```
┌─────────────────────────────┐
│ ←  Services                 │
│                             │
│  The services customers can │
│  book at your shop.         │
│  (13, muted)                │
│                             │
│  ╭─────────────────────╮    │
│  │ ── Haircuts ─────── │    │
│  │ Fade    150MAD 30min │   │
│  │          [====]     │    │
│  │ Taper   120MAD 25min│    │
│  │          [====]     │    │
│  │ ═══════════════════  │   │
│  │ ── Beard ────────── │    │
│  │ Trim     80MAD 15min│    │
│  │          [====]     │    │
│  ╰─────────────────────╯    │
│                             │
│  [     Add service     ]    │
│  (primary)                  │
│                             │
│  ── Service Form Sheet ──  │
│  (bottom-sheet modal)       │
│  ┌─────────────────────┐    │
│  │  ─── (drag handle)  │    │
│  │                     │    │
│  │  Add service        │    │
│  │                     │    │
│  │  ┌─────────────────┐│    │
│  │  │ Name            ││    │
│  │  └─────────────────┘│    │
│  │                     │    │
│  │  ┌────────┐┌───────┐│   │
│  │  │ Price $││Dur min││   │
│  │  └────────┘└───────┘│   │
│  │                     │    │
│  │  ┌─────────────────┐│    │
│  │  │ Category (opt.) ││    │
│  │  └─────────────────┘│    │
│  │                     │    │
│  │  ┌─────────────────┐│    │
│  │  │ Description     ││    │
│  │  └─────────────────┘│    │
│  │                     │    │
│  │  [   Add service  ] │    │
│  ╰─────────────────────╯    │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Grouped by category: category label + service rows
- Switch toggles for owner (enable/disable)
- Add/Edit service → bottom-sheet form
