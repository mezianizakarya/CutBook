# Onboarding: Barber Professional Screen

```
┌─────────────────────────────┐
│ ←  Tell customers about     │
│     your work               │
│                             │
│  Pick a specialty and add   │
│  your experience so clients │
│  know what to book you for. │
│  You can change this later. │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ e.g. Fades, beard   │    │
│  │ work                │    │
│  └─────────────────────┘    │
│  (Specialty TextField)      │
│                             │
│  (Fades)(Haircuts)(Beard)   │
│  (Kids)(Lineups)(Designs)   │
│  ~~~horizontal scroll~~~    │
│  (pill chips, active=primary│
│   bg + white text)          │
│                             │
│  ┌─────────────────────┐    │
│  │ e.g. 5              │    │
│  └─────────────────────┘    │
│  (years, numeric)           │
│                             │
│  ┌─────────────────────┐    │
│  │ Bio / about you     │    │
│  │                     │    │
│  └─────────────────────┘    │
│  (multiline TextField)      │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │        Save         │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│        Skip for now         │
│        (ghost, optional)    │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Horizontal chip ScrollView (overflows right by 14)
- Skip only shown during onboarding
- On save (from onboarding) → `/loading`
