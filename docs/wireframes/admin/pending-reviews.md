# Admin Pending Reviews Screen

```
┌─────────────────────────────┐
│ ←  Reviews awaiting         │
│    approval                 │
│                             │
│  Customer reviews waiting   │
│  for approval.              │
│  (13, muted)                │
│                             │
│  Reviews               1    │
│  waiting                    │
│                             │
│  [👤] Zakaria M.            │
│      Barber Milano · Aug 25 │
│      ★★★★★                  │
│      "Great barber!"        │
│      [Publish] [Remove]     │
│      (green)   (red)        │
│  ═══════════════════════    │
│  [👤] Karim A.              │
│      Barber Milano · Aug 24 │
│      ★★★☆☆                  │
│      "..."                  │
│      [Publish] [Remove]     │
│                             │
│  ╭─────────────────────╮    │
│  │ Nothing to review   │    │
│  │ No reviews are      │    │
│  │ waiting for         │    │
│  │ approval right now. │    │
│  ╰─────────────────────╯    │
│  (empty state)              │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Pull-to-refresh
- Row: Avatar 44 + name + shop · date + ★ rating (warning color) + comment (3 lines max)
- Actions: Publish (successOutline) + Remove (dangerOutline), height 36
- Action removes row from list + success notice ("Review published" / "Review removed")
- Backend: `admin_set_review_status(p_review_id, p_status)` admin-only RPC; statuses published | hidden | removed
