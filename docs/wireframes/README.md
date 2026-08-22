# CutBook App Wireframes

All pages in the app represented as ASCII wireframes.
Following the design system: `lib/theme.ts` tokens, Screen wrapper, back-button pattern (36×36 circle, surface bg, border, radius.full), card patterns, badge colors.

## Structure

```
wireframes/
├── auth/                  # Auth & onboarding flows
│   ├── welcome.md
│   ├── sign-in.md
│   ├── sign-up.md
│   ├── verify-email.md
│   ├── forgot-password.md
│   ├── reset-password.md
│   ├── choose-role.md
│   ├── complete-profile.md
│   ├── edit-profile.md
│   ├── account-info.md
│   ├── settings.md
│   ├── verification.md
│   ├── unauthorized.md
│   └── onboarding/
│       ├── owner-shop.md
│       └── barber-professional.md
├── customer/              # Customer role
│   ├── (tabs)/
│   │   ├── home.md
│   │   ├── discover.md
│   │   ├── favorites.md
│   │   ├── bookings.md
│   │   └── profile.md
│   ├── shop-detail.md
│   └── barber-profile.md
├── barber/                # Barber role
│   ├── (tabs)/
│   │   ├── dashboard.md
│   │   ├── schedule.md
│   │   ├── clients.md
│   │   └── profile.md
│   └── work-session.md
├── owner/                 # Owner role
│   ├── (tabs)/
│   │   ├── dashboard.md
│   │   ├── shop.md
│   │   ├── bookings.md
│   │   ├── staff.md
│   │   └── profile.md
│   ├── shop-services.md
│   ├── shop-hours.md
│   └── shop-verification.md
└── admin/                 # Admin role
    ├── (tabs)/
    │   ├── dashboard.md
    │   ├── shops.md
    │   ├── users.md
    │   └── settings.md
    ├── pending-verifications.md
    ├── pending-shops.md
    └── pending-shop-verifications.md
```

## Legend

```
←  = Back button (36×36 circle, radius.full, surface bg, border)
●  = Active / filled dot (primary)
○  = Inactive / empty dot (border)
▸  = Chevron forward (navigation hint)
[…] = Pressable element
═══ = Divider
~~~ = Scrollable region
```

## Badge Colors

```
Active/Approved  = bg #dcfce7, text #16a34a (success)
Pending/Warning  = bg #fef3c7, text #b45309 (amber)
Deleted/Rejected = bg #fee2e2, text #dc2626 (danger)
Primary soft     = bg #EAF2FE, text #0052AB (primaryDark)
```

## Common Patterns

- **Back button page**: `← Title` in header row, 36×36 circle button
- **Tab page**: No back button, content extends behind floating tab bar
- **Card**: surface bg, border, radius.md, padding spacing.md
- **Pill chip**: radius.full, paddingH spacing.sm, height 36
- **Search**: height 48, radius.full, surface bg, border, paddingRight 44
- **Section header**: SectionHeader component (title + optional action)
- **Notice banner**: pill 48h, success/danger/role tones, auto-dismiss 3s
- **Empty state**: Centered title + subtitle + optional action button
- **Bottom sheet**: transparent modal, slide-up, drag handle, radius.top 28
