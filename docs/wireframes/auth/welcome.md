# Welcome Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│         ╭───────╮           │
│         │ LOGO  │           │
│         │ 124×  │           │
│         ╰───────╯           │
│                             │
│  Find and book the best     │
│  barbers                    │
│  (22/700, text — title)     │
│                             │
│                             │
│                             │
│  ╭─────────────────────╮    │
│  │      Sign In        │    │
│  ╰─────────────────────╯    │
│  (primary/black, full-width) │
│                             │
│  ╭─────────────────────╮    │
│  │   Create Account    │    │
│  ╰─────────────────────╯    │
│  (outline, full-width)      │
│   (gap sm = 8, sits low —   │
│    md above legal footer)   │
│                             │
│  By continuing you agree    │
│  to our Terms of Service    │
│  and Privacy Policy.        │
│  (13 muted; links primary   │
│   600 → /terms, /privacy;   │
│   lg from screen edge)      │
└─────────────────────────────┘
```

- Centered vertically (Screen centered)
- No back button
- Sign In → `/sign-in`
- Create Account → `/sign-up`
- Logo badge 124×124; tagline styled as a title (22/700), nudged down below the logo (`marginTop: spacing.md`)
- Buttons sit as low as possible: `actions` has no extra margin, stacked right above the legal footer; button gap is `spacing.sm`
- Legal footer near the bottom edge (`paddingBottom: spacing.xs`): "Terms of Service" → `/terms`, "Privacy Policy" → `/privacy`
- If already signed in → redirects to `/loading`
