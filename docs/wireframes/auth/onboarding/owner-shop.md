# Onboarding: Owner Shop Screen

```
┌─────────────────────────────┐
│ ←  Create your shop         │
│                             │
│  Your shop goes live on     │
│  Kutz once it's approved.   │
│  You can add services and   │
│  working hours later.       │
│  (13, muted)                │
│                             │
│  ┌─────────────────────┐    │
│  │ Shop name           │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Description         │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Address             │    │
│  └─────────────────────┘    │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ City     │ │ State    │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ Postal   │ │ Country  │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ┌─────────────────────┐    │
│  │ Phone               │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 📷 Upload logo      │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 📷 Gallery photos   │    │
│  └─────────────────────┘    │
│                             │
│  ╭─────────────────────╮    │
│  │    Create shop      │    │
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
- ShopForm component (shared)
- Skip only shown during onboarding (from=signup)
- Skip → `/loading`
- On success → `/loading`
