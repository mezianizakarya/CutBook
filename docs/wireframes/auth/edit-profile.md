# Edit Profile Screen

```
┌─────────────────────────────┐
│ ←  Edit profile             │
│                             │
│  Update your name, username │
│  and professional details.  │
│  (13, muted)                │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ First    │ │ Last     │  │
│  │ name     │ │ name     │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ┌─────────────────────┐    │
│  │ @ username          │    │
│  └─────────────────────┘    │
│  (UsernameField)            │
│                             │
│  ── Professional ────────── │
│  (barber role only)         │
│                             │
│  ┌─────────────────────┐    │
│  │ e.g. Fades, beard   │    │
│  └─────────────────────┘    │
│                             │
│  (Fades)(Haircuts)(Beard)   │
│  ~~~horizontal scroll~~~    │
│                             │
│  ┌─────────────────────┐    │
│  │ Years of experience │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Bio                 │    │
│  └─────────────────────┘    │
│                             │
│  ╭─────────────────────╮    │
│  │    Save changes     │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Prefilled from DB on mount
