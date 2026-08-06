# CutBook — Database ER Diagram

Review-only artifact generated from `supabase/migrations/20260806000000_initial_schema.sql`. No schema changes.

- **18 tables** in schema `public`
- Auth identity = `profiles.id` (Clerk `sub`, text)
- Renders in GitHub, VS Code, and Mermaid live editors

```mermaid
erDiagram
    profiles ||--o{ shops : "created_by"
    profiles ||--o{ shop_members : "staff of"
    profiles ||--o{ bookings : "customer"
    profiles |o--o{ bookings : "cancelled_by"
    profiles ||--o{ reviews : "author"
    profiles ||--o{ notifications : "recipient"
    profiles ||--o{ push_tokens : "owns"
    profiles ||--o| settings : "preferences (1:1)"
    profiles |o--o{ audit_log : "actor"
    profiles |o--o{ platform_settings : "updated_by"

    shops ||--o{ shop_members : "employs"
    shops ||--o{ services : "offers"
    shops ||--o{ working_hours : "opening hours"
    shops ||--o{ bookings : "receives"
    shops ||--o{ favorites : "favorited"
    shops ||--o{ reviews : "rated"
    shops ||--o{ shop_gallery : "gallery"

    shop_members ||--o{ staff_services : "qualified for"
    shop_members ||--o{ bookings : "staff"
    shop_members ||--o{ availability : "weekly windows"
    shop_members ||--o{ time_offs : "one-off off"
    shop_members ||--o{ portfolio_images : "portfolio"

    services ||--o{ staff_services : "linked to staff"
    services ||--o{ bookings : "booked"

    bookings ||--o| reviews : "reviewed (0..1)"

    profiles {
        text id PK "Clerk sub"
        text email
        text first_name
        text last_name
        text phone
        text avatar_url "-> avatars bucket"
        text bio
        text city
        text role "customer|barber|owner|admin"
        boolean is_disabled
        boolean onboarding_completed
        timestamptz last_active_at
        timestamptz deleted_at "soft delete"
        timestamptz created_at
        timestamptz updated_at
    }
    shops {
        bigint id PK
        text name
        text slug UK
        text description
        text logo_url "-> shop-logos bucket"
        text address_line1
        text address_line2
        text city
        text state
        text country
        text postal_code
        double latitude
        double longitude
        text phone
        text email
        text website
        text status "pending|approved|suspended"
        boolean is_verified
        boolean is_active
        numeric rating_avg "trigger-maintained"
        integer rating_count
        timestamptz deleted_at "soft delete"
        text created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    shop_members {
        bigint id PK
        bigint shop_id FK
        text profile_id FK
        text member_role "owner|manager|barber"
        text display_name
        text avatar_url
        timestamptz joined_at
        timestamptz removed_at "soft delete"
        timestamptz created_at
        timestamptz updated_at
    }
    services {
        bigint id PK
        bigint shop_id FK
        text name
        text description
        integer duration_minutes
        integer price_cents
        text category
        boolean is_active
        integer sort_order
        timestamptz created_at
        timestamptz updated_at
    }
    staff_services {
        bigint id PK
        bigint shop_member_id FK
        bigint service_id FK
        integer price_cents "nullable override"
        integer duration_minutes "nullable override"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    bookings {
        bigint id PK
        bigint shop_id FK
        text customer_id FK
        bigint staff_id FK
        bigint service_id FK
        text status "pending|confirmed|completed|cancelled|no_show"
        timestamptz starts_at
        timestamptz ends_at
        text service_name "snapshot"
        integer service_price_cents "snapshot"
        integer service_duration_minutes "snapshot"
        text note
        text cancel_reason
        timestamptz cancelled_at
        text cancelled_by_id FK "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    working_hours {
        bigint id PK
        bigint shop_id FK
        smallint day_of_week "0=Sun..6=Sat"
        time opens_at
        time closes_at
        boolean is_closed
        timestamptz created_at
        timestamptz updated_at
    }
    availability {
        bigint id PK
        bigint shop_member_id FK
        smallint day_of_week
        time starts_at
        time ends_at
        timestamptz created_at
        timestamptz updated_at
    }
    time_offs {
        bigint id PK
        bigint shop_member_id FK
        timestamptz starts_at
        timestamptz ends_at
        text reason
        timestamptz created_at
        timestamptz updated_at
    }
    favorites {
        bigint id PK
        text customer_id FK
        bigint shop_id FK
        timestamptz created_at
    }
    reviews {
        bigint id PK
        bigint shop_id FK
        text customer_id FK
        bigint booking_id FK "nullable, SET NULL"
        smallint rating "1..5"
        text comment
        text author_name "trigger-set snapshot"
        text owner_response
        timestamptz responded_at
        text status "pending|published|hidden|removed"
        timestamptz created_at
        timestamptz updated_at
    }
    notifications {
        bigint id PK
        text recipient_id FK
        text type
        text title
        text body
        jsonb data
        timestamptz read_at
        timestamptz created_at
    }
    push_tokens {
        bigint id PK
        text profile_id FK
        text platform "ios|android|web"
        text token UK
        text device_name
        timestamptz last_used_at
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    shop_gallery {
        bigint id PK
        bigint shop_id FK
        text object_path "-> shop-gallery bucket"
        text caption
        boolean is_cover
        integer sort_order
        timestamptz created_at
    }
    portfolio_images {
        bigint id PK
        bigint shop_member_id FK
        text object_path "-> portfolio bucket"
        text caption
        boolean is_cover
        integer sort_order
        timestamptz created_at
    }
    settings {
        text profile_id PK FK "1:1 with profiles"
        jsonb notification_prefs
        text locale
        boolean marketing_opt_in
        timestamptz updated_at
    }
    audit_log {
        bigint id PK
        text actor_id FK "nullable, SET NULL"
        text action
        text entity_type
        text entity_id
        jsonb before
        jsonb after
        text ip_address
        timestamptz created_at
    }
    platform_settings {
        text key PK
        jsonb value
        text description
        text updated_by FK "nullable, SET NULL"
        timestamptz updated_at
    }
```

## Storage bucket relationships

Supabase Storage buckets referenced by URL columns / object paths. Path folder rule = key used by RLS policies.

```mermaid
erDiagram
    "avatars" ||--o{ profiles : "avatar_url  folder = <profile_id>"
    "shop-logos" ||--o{ shops : "logo_url  folder = <shop_id>"
    "shop-gallery" ||--o{ shop_gallery : "object_path  folder = <shop_id>"
    "portfolio" ||--o{ portfolio_images : "object_path  folder = <shop_member_id>"

    "avatars" {
        text id PK "public bucket, images only"
    }
    "shop-logos" {
        text id PK "public bucket, images only"
    }
    "shop-gallery" {
        text id PK "public bucket, images only"
    }
    "portfolio" {
        text id PK "public bucket, images only"
    }
```

## Cardinality summary

### 1:1
| Left | Right | Via |
|---|---|---|
| `profiles` | `settings` | `settings.profile_id` PK+FK (cascade) |

### 1:N
| Parent | Child | FK on child | On delete |
|---|---|---|---|
| `profiles` | `shops` | `created_by` | restrict |
| `profiles` | `shop_members` | `profile_id` | restrict |
| `profiles` | `bookings` (customer) | `customer_id` | restrict |
| `profiles` | `bookings` (cancelled by) | `cancelled_by_id` (nullable) | restrict |
| `profiles` | `reviews` | `customer_id` | restrict |
| `profiles` | `notifications` | `recipient_id` | cascade |
| `profiles` | `push_tokens` | `profile_id` | cascade |
| `profiles` | `audit_log` | `actor_id` (nullable) | set null |
| `profiles` | `platform_settings` | `updated_by` (nullable) | set null |
| `shops` | `shop_members` | `shop_id` | restrict |
| `shops` | `services` | `shop_id` | restrict |
| `shops` | `working_hours` | `shop_id` | cascade |
| `shops` | `bookings` | `shop_id` | restrict |
| `shops` | `favorites` | `shop_id` | cascade |
| `shops` | `reviews` | `shop_id` | restrict |
| `shops` | `shop_gallery` | `shop_id` | cascade |
| `shop_members` | `bookings` (staff) | `staff_id` | restrict |
| `shop_members` | `availability` | `shop_member_id` | cascade |
| `shop_members` | `time_offs` | `shop_member_id` | cascade |
| `shop_members` | `portfolio_images` | `shop_member_id` | cascade |
| `services` | `bookings` | `service_id` | restrict |
| `bookings` | `reviews` | `booking_id` (nullable) | set null |

### N:N (junction tables)
| Left | Right | Junction | Notes |
|---|---|---|---|
| `shop_members` | `services` | `staff_services` | which staff perform which services; optional per-staff price/duration overrides |
| `profiles` | `shops` | `favorites` | unique `(customer_id, shop_id)` |

## Notable constraints

- **`bookings_no_overlap`** — GiST EXCLUDE on `(staff_id, tstzrange(starts_at, ends_at, '[)'))` WHERE `status NOT IN ('cancelled','no_show')` → DB-level double-booking prevention.
- **Unique** — `profiles.phone` (partial, non-null), `shops.slug`, `working_hours(shop_id, day_of_week)`, `availability(shop_member_id, day_of_week, starts_at)`, `favorites(customer_id, shop_id)`, `reviews(shop_id, customer_id)`, `push_tokens.token`.
- **Soft deletes** — `profiles.deleted_at`, `shops.deleted_at`, `shop_members.removed_at` preserve history while RLS filters active rows.
- **History snapshots** — `bookings` copies service name/price/duration; `reviews.author_name` snapshot via trigger.
- **Aggregates** — `shops.rating_avg` / `rating_count` maintained by triggers.
