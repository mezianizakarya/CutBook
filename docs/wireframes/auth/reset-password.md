# Reset Password Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│  Set a new password         │
│  (28/800)                   │
│                             │
│  Choose a strong password   │
│  you haven't used before.   │
│  (15, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ At least 8 chars    │    │
│  └─────────────────────┘    │
│  (password TextField)       │
│                             │
│  ┌─────────────────────┐    │
│  │ Re-enter new pass   │    │
│  └─────────────────────┘    │
│  (password TextField)       │
│                             │
│  (error text if any)        │
│                             │
│  ╭─────────────────────╮    │
│  │   Reset Password    │    │
│  ╰─────────────────────╯    │
│  (primary, full-width)      │
│                             │
│     Back to sign in         │
│     (primary color link)    │
│                             │
└─────────────────────────────┘
```

- Scroll + centered Screen
- No back button
- Client validation: min 8 chars, password match
- Back to sign in → `/sign-in`
- On success → `/loading`
