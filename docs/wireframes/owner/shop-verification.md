# Owner Shop Verification Screen

```
┌─────────────────────────────┐
│ ←  Shop verification        │
│                             │
│  Verify your business so    │
│  customers know they can    │
│  trust you.                 │
│  (13, muted)                │
│                             │
│  ╭─────────────────────╮    │
│  │ ✅ Verified         │    │
│  │                     │    │
│  │ This shop is        │    │
│  │ verified. Customers │    │
│  │ will see a verified │    │
│  │ badge on your page. │    │
│  ╰─────────────────────╯    │
│  (if verified)              │
│                             │
│  ── OR ──                   │
│                             │
│  ╭─────────────────────╮    │
│  │ ⏳ Pending review   │    │
│  │                     │    │
│  │ Requested Aug 18    │    │
│  │ "We've been open    │    │
│  │  for 3 years..."    │    │
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
│  │ "Need more docs"    │    │
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
│  │ Why should this     │    │
│  │ shop be verified?   │    │
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
