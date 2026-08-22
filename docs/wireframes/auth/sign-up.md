# Sign Up Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Create your account        │
│  (28/800)                   │
│                             │
│  We'll email you a          │
│  verification code to       │
│  confirm your address.      │
│  (15, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ you@example.com     │    │
│  └─────────────────────┘    │
│  (email TextField)          │
│                             │
│  ┌─────────────────────┐    │
│  │ Create a password   │    │
│  └─────────────────────┘    │
│  (password TextField)       │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │   Create Account    │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│  Already have an account?   │
│  Sign in                    │
│  (primary color link)       │
│                             │
│  (hidden Clerk CAPTCHA)     │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen
- No back button
- Sign in → `/sign-in`
- On success → `/verify-email?mode=signup`
