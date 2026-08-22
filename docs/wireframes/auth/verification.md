# Verification Request Screen

```
┌─────────────────────────────┐
│ ←  Request verification     │
│                             │
│  Get a verified badge on    │
│  your account so clients    │
│  know they can trust you.   │
│  (13, muted)                │
│                             │
│  ╭─────────────────────╮    │
│  │ ✅ You're verified  │    │
│  │                     │    │
│  │ Your account has    │    │
│  │ been verified.      │    │
│  ╰─────────────────────╯    │
│  (if verified)              │
│                             │
│  ── OR ──                   │
│                             │
│  ╭─────────────────────╮    │
│  │ ⏳ Pending review   │    │
│  │                     │    │
│  │ Requested Aug 18    │    │
│  │ "I've been cutting  │    │
│  │  hair for 5 years"  │    │
│  │                     │    │
│  │ ( Withdraw request )│    │
│  ╰─────────────────────╯    │
│  (if pending)               │
│                             │
│  ── OR ──                   │
│                             │
│  ╭─────────────────────╮    │
│  │ ❌ Rejected         │    │
│  │                     │    │
│  │ "Need more info"    │    │
│  │                     │    │
│  │ ( Request again )   │    │
│  ╰─────────────────────╯    │
│  (if rejected)              │
│                             │
│  ── OR ──                   │
│                             │
│  ╭─────────────────────╮    │
│  │ Get verified        │    │
│  │                     │    │
│  │ Why do you want to  │    │
│  │ be verified?        │    │
│  │ ┌─────────────────┐ │    │
│  │ │ (multiline)     │ │    │
│  │ └─────────────────┘ │    │
│  │                     │    │
│  │ ( Request verify )  │    │
│  ╰─────────────────────╯    │
│  (if no request yet)        │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Multiple conditional states
- Withdraw uses double-press confirm (5s countdown)
