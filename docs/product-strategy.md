# KUTZ Product Strategy

The vision for KUTZ in the Algerian market. This is the strategic foundation —
read before any feature work.

## The core question

KUTZ must not be positioned as "an app to book a haircut." In Algeria the
question is: **"Can we make barbershops change the way they operate every single
day?"**

- Algeria is already highly mobile/digital: ~37.8M internet users (79.5%
  penetration), 27.5M social-media identities by late 2025.
- Online payments grew 179% in 2025; mobile P2P transfers reached ~647.4B DZD.
- The problem is not digital capability — it is **changing an existing habit**.
  The customer already knows "I go to my barber" and already has their barber's
  phone/WhatsApp/Instagram.
- KUTZ must provide something WhatsApp + Instagram + walking in cannot provide.

## KUTZ solves TWO problems

- **Customer:** "I want my haircut with minimum waiting and uncertainty."
- **Barber/shop:** "I want my day organized and my customers managed without
  chaos."

The shop side (work sessions, queue/timing, customer trust levels, booking
notes, loyalty, staff management, services, working hours) is more interesting
than a simple booking calendar.

## The killer feature: the LIVE SHOP QUEUE

What makes KUTZ famous. A customer opens the app and sees:

```
Fade Factory
3 barbers working
12 people today
Estimated wait: 18 min

Ahmed — 8 min remaining
Yousef — 22 min remaining
Karim — 41 min remaining

Book your place
```

When a barber adds +5 minutes to a haircut, every affected customer's estimated
time updates automatically. Real shops do not run exactly on the clock, so this
beats "your appointment is at 15:00."

## Work Session as the operational engine

Barber flow: Start Day → Next Customer → Start Cut → Timer begins → +1/+2/+5 min
→ queue recalculates → Finish Cut → next customer becomes active → customer
notified → Finish → Repeat.

The database must know exactly: who is working, which customer is being served,
which booking is next, estimated start, actual start, estimated finish, actual
finish, added time, waiting time, delays, cancellations, no-shows, completed
cuts. This data becomes extremely valuable later.

## Don't launch 50 features

Reputation, trust levels, loyalty, streaks, rewards, notes, work sessions,
shops, barbers, services, working hours, profiles, galleries, bookings,
notifications — all good ideas, but **not at launch**.

First goal: make ONE barber shop operate successfully through KUTZ. Not 1,000
users. Not 100 shops. One excellent shop.

## MVP: 5 pillars

1. **Shop** — create shop, add services, set prices, set duration, set working
   hours, add barbers, manage staff, see bookings.
2. **Barber** — professional profile, join shop, see today's work, start work
   session, start cut, extend time, finish cut, move to next customer, take
   break.
3. **Customer** — discover shops, see services/barbers/prices/availability,
   book, add booking note, see estimated waiting time, see booking status,
   receive updates.
4. **Live queue** — the magic; the entire shop's schedule reacts to reality.
5. **Trust** — customers develop a reputation from actual behavior
   (completed bookings, cancellations, late cancellations, no-shows, history),
   e.g. New → Regular → Reliable → Trusted → Elite. Helps barbers understand
   customers.

## Acquisition truth

- Never ask the customer to "download KUTZ to book." Say instead: "You can see
  exactly when your turn is and avoid sitting here for 40 minutes."
- First customers must NOT be random customers. Target **5–10 barbershops** that
  are busy, multi-barber, have waiting customers, use Instagram/WhatsApp, have
  scheduling problems, and care about appearing professional. A shop with 20–50
  customers/day feels the problem; a two-customers-a-day barber does not.
- **Go physically to barbershops.** Research before selling. Ask: how do you
  know who's next? Do you use WhatsApp? How many wait daily? How do you handle
  delays / early finishes / longer haircuts? How do customers know their turn?
  How do you handle no-shows? How do you remember regulars? What's your biggest
  daily problem?
- The first shop is a **laboratory**. Observe the real flow (owner creates
  booking, customer arrives, barber starts cut, gets interrupted, customer late,
  +7 min cut, break, cancellation, early arrival) and let each situation reveal
  and fix a weakness in the system.

## Algeria-specific behavior

- **Cash stays perfectly acceptable.** MVP = booking + queue + management,
  no forced online payment.
- Later explore: online deposits, QR payments, prepaid bookings, shop
  subscriptions, digital receipts. Don't make payment the reason KUTZ succeeds.

## Competition

- **WhatsApp is the biggest competitor** ("Bro, are you free at 5?" → "Come at
  5"). KUTZ replaces a conversation with a system: book → know position →
  know estimated time → updates → arrive when your turn is close.
- **Instagram is the second competitor — don't fight it, use it.** Every shop
  gets a KUTZ booking link for their bio:

  ```
  ✂️ Fade Factory
  📍 Oran
  ⭐ 4.8
  💈 4 barbers
  🕐 Open until 20:00
  Book with KUTZ
  ```

  Instagram becomes the acquisition channel.

## Barber UX must be trivial

A barber won't operate a complex business app mid-haircut. The Work Session
screen should feel like a physical control panel:

```
NOW
Customer
Service
Timer
+1  +2  +5
Finish
```

No extra menus, no analytics during a cut, no 15 buttons.

## Owner dashboard = money + performance

Today: 32 bookings / 27 completed / 3 cancelled / 2 no-shows / 12,400 DA
revenue / avg haircut 27 min / avg delay +4 min / top barber / busy period
17:00–19:00. This turns KUTZ into "the operating system for the barbershop" and
the reason an owner keeps paying.

## Loyalty vs reputation must stay separate

- **Loyalty** = how often a customer returns. Shop-controlled program, e.g.
  5 visits → free beard trim, 10 → 20% off, 20 → free haircut. Customer sees
  "7 visits · 3 more until your next reward."
- **Reputation** = how reliable a customer is.
- Do not mix them: an elite loyal customer can have a bad cancellation record;
  a new customer can have perfect reliability.

## Booking notes matter

Service: Taper Fade · Note: "Keep the back longer." — barber sees it before
starting. Later: saved customer preferences (low taper, #2 sides, beard 5mm,
no razor, short fringe) so the barber never re-asks returning customers.

## Why KUTZ could fail

1. Building too much before validating → get real shops using it immediately.
2. Beautiful but useless → beauty is not the product; operational value is.
3. Requiring too much from barbers (14 fields + verification + documents) →
   only require what the workflow needs.
4. **Bad timing predictions** — the most dangerous technical problem. "Your turn
   is in 8 minutes" that becomes 30 destroys trust. The queue algorithm must
   become extremely reliable.
5. No shops → solve the marketplace problem city by city, never Algeria-wide.

## Growth loop

```
Barbershop joins KUTZ
→ shop gets a KUTZ booking link
→ link on Instagram
→ customer books
→ customer uses KUTZ
→ customer sees live queue
→ good experience
→ customer returns
→ customer earns loyalty
→ customer books again
→ customer tells friends
→ more customers
→ shop becomes more valuable
→ more shops want KUTZ
```

## Business model

- Customers: **free.**
- Shops: Free tier (basic profile + limited booking) and a Pro tier
  (e.g. 1,500–3,000 DA/month: unlimited bookings, queue management, staff
  management, analytics, loyalty, customer management, notifications).
- Don't choose the price today. Prove the shop receives enough value to pay.

## The real moat: DATA

After thousands of bookings KUTZ knows: average haircut duration, actual vs
configured duration, peak hours, cancellation/no-show rate, barber performance,
customer return rate, average queue delay, popular services, busy days, loyalty
behavior. Then it becomes smarter — "your average Fade actually takes 34 min,
not 25", "Friday 17:00–19:00 is your busiest period", "you are consistently 18
minutes behind on Saturdays." Harder to copy than any feature.

## Roadmap

- **Phase 0 — NOW:** no more random features. Make Booking → Queue → Work
  Session → Finish → Next Customer reliable; rock-solid database state
  transitions.
- **Phase 1 — Pilot:** 5–10 real shops in one Algerian city. Watch everything.
- **Phase 2 — Fix:** measure booking completion, cancellations, no-shows,
  average delay, work-session errors, customer retention, shop usage. Fix the
  biggest problems.
- **Phase 3 — First real launch:** 20–50 shops, same city, no geographic
  spread.
- **Phase 4 — Monetization:** charge once shops say "I don't want to operate
  without KUTZ."
- **Phase 5 — Expand:** city → city → Algeria → North Africa → international.

## The ONE thing KUTZ should be famous for

**"Know your turn. Run your shop."**

- Customers: know when it's your turn.
- Barbers: know who you're serving.
- Owners: know what's happening in your shop.

## The biggest advice

Stop thinking like a developer ("what page should I build next?"). Think:
**"What happens inside an Algerian barbershop at 6:30 PM on a Friday?"**

Go sit in a busy barber shop and watch 20 customers, the barber, the owner, the
communication, the chaos — without touching the laptop. Then ask: "Which part of
this chaos can KUTZ eliminate?"

Success is not guaranteed by Algeria becoming digital. Success is when a barber
says: **"Before KUTZ, managing my customers was annoying. Now I don't want to
work without it."** That's the milestone to chase first.
