# Barber Work Session Screen

```
┌─────────────────────────────┐
│ ←  Today's Work      8 / 12 │
│                             │
│  ╭─────────────────────╮    │
│  │ ● NOW SERVING       │    │
│  │                     │    │
│  │ Youssef Benali      │    │
│  │ Fade · 30 min       │    │
│  │                     │    │
│  │     ╭───────╮       │    │
│  │    ╱ 18:42   ╲      │    │
│  │   │ remaining │     │    │
│  │    ╲         ╱      │    │
│  │     ╰───────╯       │    │
│  │                     │    │
│  │ Note — keep the     │    │
│  │ back longer         │    │
│  │                     │    │
│  │ (+1 min)(+2 min)(+5)│   │
│  │                     │    │
│  │ [   Finish Cut    ] │    │
│  │ ═══════════════════  │   │
│  │ NEXT                │    │
│  │ Adam B. · Taper     │    │
│  │              ~12 min│    │
│  ╰─────────────────────╯    │
│                             │
│  TODAY'S QUEUE      View all│
│  ● Youssef          In chair│
│  ● Adam              Waiting│
│  ● Sami              Waiting│
│  ○ Karim              Done  │
│                             │
│  [ + Add walk-in ] [ Break ]│
│  (outline)      (outline)   │
│                             │
└─────────────────────────────┘
```

- Scroll Screen, paddingHorizontal=14
- ← Back button (36×36 circle)
- Counter: completed / total
- Now Serving card: customer, service, timer, note, extend buttons, Finish Cut
- Next preview: avatar, name, service, duration
- Queue list: dot + name + status (Done/In chair/Waiting)
- Bottom actions: Add walk-in + Break
- Realtime Supabase subscription for live updates
