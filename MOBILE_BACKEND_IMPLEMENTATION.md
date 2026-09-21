# MyGirl — mobile clubs, meetings and Realtime: implementation status

## What is actually committed
- `src/ClubsMeetupsScreen.js`: accessible **local-only** Club / Meeting tabs inside the existing `Grupy` bottom tab, creation forms, city and interests, future-date validation, demo join/leave, delete own demo entries and report action. App keeps this screen mounted across tab switches, but everything resets when the app restarts or the demo account resets. Do not use this flow to invite real people.
- `App.js`: mounts the new screen, retains 5 bottom tabs.
- `supabase/AFTER_FRESH_INSTALL_006_CLUBS_MEETUPS_REALTIME.sql`: adds moderated `meetups`, RSVPs, club category/rules on existing `groups`, report target for meetups, message client-generated UUID retry deduplication. No live SQL execution has taken place.
- `src/services/chatRealtime.js`: optional infrastructure module accepting ONE shared, authenticated Supabase client; query 30 messages per page, scope event subscription to one active room, unsubscribe, retry-safe sends. It is intentionally not connected to the demo UI.

## Fresh project SQL order (never MyCampus)
1. `supabase/MYGIRL_FRESH_INSTALL.sql` ONCE on a brand-new project (do not also execute old migrations 001–003).
2. `supabase/AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql`.
3. `supabase/AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql`.
4. `supabase/AFTER_FRESH_INSTALL_006_CLUBS_MEETUPS_REALTIME.sql`.

**Do not run these on an existing project with data.** Verify all SQL in a throwaway project and perform independent account A/B RLS tests first. The generated combined SQL script must be updated to include 006 before using it for a new installation. Do not paste service-role/secret keys into React Native or public website.

## Model
`groups` = clubs, `group_members` = club memberships, `meetups` = organized outings (optionally tied to an approved club), `meetup_rsvps` = interest/attendance, `conversations` = direct or group chat rooms, `conversation_participants` = explicit membership, `messages` = permanent history, `reports` = moderation queue. The clients may create *pending* clubs and meetings, never approve them. Moderation service must approve or reject in a trusted environment. `going` RSVP is deliberately not writable by clients until an atomic capacity-checking endpoint exists. A city/venue is not an exact residential address.

## Realtime & parallel connections
Use one `createClient()` instance and one WebSocket per logged-in app session. Each device is normally one concurrent connection; one connection may carry multiple channels. Subscribe to *only* the active room; remove it on exit. Do not mount duplicate listeners on each render. Request missing history after subscribe/reconnect; deduplicate on server message UUID, merge on client by `messages.id` and sort by created_at/id. Use pagination and FlatList (virtualized) for history. For read receipts, typing, online presence, push notifications and an inbox badge add separately authorized flows, not a broadcast of the entire messages table.

`chatRealtime.js` demonstrates Postgres Changes, but **Realtime publication and authorization have not been configured**. This has a different scaling profile from database-trigger Broadcast. Choose/test the final transport on the new project and inspect current Supabase quotas before launch. Base schema marks every message `pending`; recipients will not see it until the trusted moderation workflow changes it to `approved` (client cannot approve). Without moderator and room-creation server endpoints, there is no real messaging service. Realtime notifications are ephemeral, not guaranteed history delivery.

## Required production work
- Configure separate MyGirl Auth, secure persistent sessions, Apple login if applicable, DOB/adult eligibility, legal versions and account deletion worker; use real published privacy/terms before collecting personal data.
- Implement safe image upload and private Storage access; photo consent and rights. Never use fake demo faces as actual members.
- Enforce moderation, spam prevention, abuse limits and block checks across group memberships, invitations, event attendance, direct messaging and notification fan-out.
- Write atomic server-side RSVP function using a row lock on the meetup and count accepted attendees to prevent double-booking at capacity. No current demo RSVP represents a guaranteed seat.
- Configure Realtime, test with at least two independent Auth users, concurrent reconnects, duplicate retries, blocking after a chat starts, membership removal, offline resync and bursts. Monitor database connections, Realtime limits and bandwidth; the free tier is not an unlimited-concurrency service.
- Run Expo dependency checks, actual native builds and on-device tests. This work was committed to GitHub only; there is **no verified deployed Supabase project**, no measured load test and no App Store build.
