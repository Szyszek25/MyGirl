# MyGirl — App Store release checklist

Current status: **prototype, not ready for App Store review**. The project includes demonstrative profiles, posts, groups, and local-only chats. Do not claim these are real members or that verification works.

## Engineering
- [ ] Run `npm install` and `npx expo install --check`; align Expo, React, RN and font package versions to the selected supported Expo SDK.
- [ ] Run `npx expo-doctor`, `npx expo export --platform ios` and test on physical iPhone via Expo Go; use a development build if an added library requires native code.
- [ ] Replace the temporary custom bottom tab bar with React Navigation/Expo Router tabs after installing SDK-compatible versions and verifying native safe areas.
- [ ] Test swipe vs vertical scrolling, long names, large accessibility text, keyboard avoidance, slow networking, offline image fallbacks, and Android back behavior.
- [ ] Add app icon (1024×1024), splash/launch assets, screenshots, app store description and support URL; do not ship stock portraits as actual users.
- [ ] Verify ownership of `ios.bundleIdentifier` and `android.package` in `app.json`; configure EAS project and signing credentials.

## Product and privacy
- [ ] Implement actual authentication, secure sessions and age/eligibility policy before public profiles.
- [ ] Implement photo upload, consent, report/block, account deletion, moderation and customer support; protect location/profile data.
- [ ] Publish real privacy policy and terms, complete Apple's App Privacy questionnaire and any applicable privacy manifests.
- [ ] Replace demo content with licensed assets or consented users; do not imply verification without a real verification flow.
- [ ] Determine which user-provided data is actually processed and update onboarding notices and consent appropriately.
- [ ] Implement real backend for posts, friends, groups and chat, with rate limiting, RLS and notification permissions only where used.

## Submission
- [ ] Set real App Store Connect app record, Apple Developer membership, version/build, age rating and content moderation information.
- [ ] Perform an internal/TestFlight review, test account/review notes if login is required, and submit only when the end-to-end service works.

### EAS commands (after verification)
`npx eas-cli login`
`npx eas-cli build:configure`
`npx eas-cli build --platform ios --profile preview`
`npx eas-cli build --platform ios --profile production`
`npx eas-cli submit --platform ios --profile production`

The presence of `eas.json` only prepares profiles; it does **not** mean a build or App Store submission has occurred.
