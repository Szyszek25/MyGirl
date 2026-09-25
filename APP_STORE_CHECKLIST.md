# Polka — App Store launch gate (25 September 2026)

**STATUS: NOT READY TO SUBMIT.** This is a local Expo demo, not a deployed social network. Demo reports are not sent to a moderator; demo account reset is NOT deletion of an online account. Do not imply otherwise in the UI, screenshots or store listing.

## Apple requirements verified against official sources

- **Guideline 1.2, user-generated content:** filter objectionable material before public display; let members report content; respond to reports promptly; block abusive people; publish accessible contact information. All five pieces must actually work. https://developer.apple.com/app-store/review/guidelines/
- **Guideline 5.1.1(v), account deletion:** if members can create accounts, they must be able to initiate deletion from inside the app. Deactivation or sign-out alone is insufficient. Delete associated posts, photos and other personal data except legitimately retained records, and explain any retention. https://developer.apple.com/support/offering-account-deletion-in-your-app
- **Privacy policy:** a real accessible URL in both the app and App Store Connect; disclose collection, sharing, retention and deletion accurately. https://developer.apple.com/app-store/review/guidelines/
- **Sign in with Apple:** if enabled, implement token revocation for deleting those accounts before release. https://developer.apple.com/support/offering-account-deletion-in-your-app

## Implemented in code, but not deployed

- [x] Visible report entry points on demo profiles, posts, groups and chats, with explicit notice that reports are NOT transmitted. `src/Safety.js`.
- [x] Local profile block/unblock, also hides blocked demo people from discovery, social feed and private chat. Not persistent. `App.js`, `src/screens.js`.
- [x] Own locally created post deletion with destructive confirmation. `src/screens.js`.
- [x] Profile → Security → delete **demo data** with confirmation and reset of session state. This is NOT online account deletion. `src/Safety.js`.
- [x] Supabase migrations for block privacy and for pending-by-default posts, owner-only deletion and private profile/post reports. `supabase/migrations/`.
- [x] Authenticated server deletion function source and API adapter; neither is deployed or called by the demo. `supabase/functions/delete-account/`, `src/services/safetyApi.js`.

## HARD RELEASE BLOCKERS — complete before inviting real members

- [ ] Create and connect a **separate** Polka Supabase project; apply all migrations in order, inspect errors and test RLS as two different authenticated members. NEVER run on MyCampus.
- [ ] Implement actual auth/session handling and connect report/block/delete-post UI to the authenticated API adapter. Persist and refetch blocking, remove blocked content on both sides, test direct access by ID and messaging restrictions.
- [ ] Build moderation operations: review queue accessible only to authorized staff, documented response procedure, abuse rate limiting, filtering of text/images BEFORE public display. New DB posts start `pending` and are not publicly visible until approved. Demo group/chat reports need their own protected database schema before those features go live.
- [ ] Implement real account deletion UI for signed-in users that confirms the action and invokes the deployed `delete-account` server function. Confirm auth row, related records, authored posts, media and sessions are removed, including failed/partial deletion recovery. Audit new tables and image paths before enabling uploads.
- [ ] If adding Apple login, implement Apple token revocation first; the current server function deliberately refuses to delete Apple-linked accounts rather than claim revocation occurred.
- [ ] Publish actual Polka support contact, privacy policy, terms and community standards. Put links inside the app and in App Store Connect. Provide age eligibility, report turnaround and escalation procedures.
- [ ] Replace stock demo portraits and fictional accounts with licensed media or consenting people; never market demo personas as real women.
- [ ] Security review: storage policies and user-owned file paths, RLS, auth, admin permissions, data retention/deletion, audit logging and testing of blocked-user access.

## Engineering / App Store packaging

- [ ] Run `npm install`, `npx expo install --check`, `npx expo-doctor` and `npx expo export --platform ios`; resolve dependency issues. These have **not** been run here.
- [ ] Test on a physical iPhone with a compatible development build, and on Android. Validate keyboard, long text, accessibility, back navigation, swiping, offline/network failures and image loading.
- [ ] Replace handwritten tab bar with tested navigation and proper safe-area handling; the information architecture is now Start / Plany / Grupy / Czaty / Profil, but the navigation implementation still needs production hardening.
- [ ] Add app icon, splash assets and real screenshots. Store metadata draft is in `APP_STORE_METADATA_PL.md`; release steps are in `IOS_RELEASE_RUNBOOK.md`. Verify ownership/availability of `pl.polka.app`, create the App Store Connect record, add support/privacy URLs, reviewer account and signing.
- [ ] Run TestFlight, App Privacy questionnaire, privacy manifests where required, and human review before submission.

### When the project is connected

Deploy migrations 001 → 002 → 003 to NEW Supabase; deploy `delete-account` with JWT verification enabled; use only server-side secrets for admin operations; connect authenticated app calls from `src/services/safetyApi.js`. Do not publish until a moderator can actually handle reports and the Apple account-deletion path is tested end-to-end.

`eas.json` contains build profiles only. No build, App Store submission, or remote Supabase migration has been performed.
