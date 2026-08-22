# Sign In Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Welcome back               │
│  (28/800)                   │
│                             │
│  Sign in to your Kutz       │
│  account                    │
│  (15, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ you@example.com     │    │
│  └─────────────────────┘    │
│  (email TextField)          │
│                             │
│  ┌─────────────────────┐    │
│  │ Your password        │    │
│  └─────────────────────┘    │
│  (password TextField)       │
│                             │
│  (error text if any)        │
│                             │
│        Forgot password?     │
│        (primary color)      │
│                             │
│  ╭─────────────────────╮    │
│  │       Sign In       │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│  Don't have an account?     │
│  Sign up                    │
│  (primary color link)       │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen
- No back button
- Forgot password → `/forgot-password`
- Sign up → `/sign-up`
- On success → `/loading`
- Has MFA sub-view (replaces form with code field)
