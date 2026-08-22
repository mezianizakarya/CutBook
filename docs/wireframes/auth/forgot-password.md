# Forgot Password Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Forgot your password?      │
│  (28/800)                   │
│                             │
│  Enter your email and       │
│  we'll send you a code      │
│  to reset your password.    │
│  (15, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ you@example.com     │    │
│  └─────────────────────┘    │
│  (email TextField)          │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │   Send Reset Code   │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│  Remembered your password?  │
│  Sign in                    │
│  (primary color link)       │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen
- No back button
- Sign in → `/sign-in`
- On success → `/verify-email?mode=reset`
