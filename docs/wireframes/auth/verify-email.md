# Verify Email Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Verify your email          │
│  (28/800)                   │
│                             │
│  Enter the 6-digit code     │
│  that was sent to your      │
│  email address.             │
│  (15, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │      000000         │    │
│  └─────────────────────┘    │
│  (numeric TextField)        │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │     Verify Code     │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│        Resend code          │
│        (primary color)      │
│                             │
│        Back to app          │
│        (muted color)        │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen
- No back button
- Accepts `mode` param (signup | reset | verify)
- Back to app → `/loading`
