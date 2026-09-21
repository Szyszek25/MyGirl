# MyGirl — App Store release checklist

Current status: **prototype, not ready for App Store review**. Profiles, posts, groups and chats are only fictional demo data and local UI.

## Engineering
- [ ] Run `npm install`, `npx expo install --check`, `npx expo-doctor` and `npx expo export --platform ios`. Resolve any dependency errors.
- [ ] **iPhone:** Expo Go distributed via Apple's App Store stops at SDK 54, while this project uses SDK 57. Test SDK 57 on iOS using an EAS development build, not an assumed compatible App Store Expo Go installation. Android Expo Go also needs matching SDK.
- [ ] Replace temporary custom bottom tabs with SDK-compatible React Navigation / Expo Router navigation and proper `react-native-safe-area-context` handling.
- [ ] Test accessibility, swipe versus vertical scroll, offline image fallbacks, keyboard avoidance, large fonts and slow connection.
- [ ] Add 1024×1024 app icon, splash assets, real screenshots, support URL and store description.
- [ ] Verify ownership of `ios.bundleIdentifier` and `android.package`, link EAS project and configure signing credentials.

## Product, privacy, safety
- [ ] Build real authentication, secure sessions and age eligibility policy.
- [ ] Implement photo upload, permission flow, report/block, account deletion, moderation and support before user-generated content goes public.
- [ ] Publish privacy policy and terms, answer App Privacy questionnaire and add privacy manifests where required.
- [ ] Replace illustrative portrait URLs with licensed/consented media; do not imply fake profiles or verification are real.
- [ ] Implement persistence, actual groups, posts and messaging, database RLS, abuse protection and data retention policy.
- [ ] Replace current demo acknowledgment with accurate production privacy notices and consent mechanisms.

## Review and distribution
- [ ] Create App Store Connect record and complete age rating, content-moderation information and required review details.
- [ ] Test on devices and through TestFlight; provide a reviewer account if access requires authentication.

### EAS commands, after dependency verification
`npx eas-cli login`
`npx eas-cli build:configure`
`npx eas-cli build --platform ios --profile development`
`npx eas-cli build --platform ios --profile production`
`npx eas-cli submit --platform ios --profile production`

`eas.json` provides build profiles but no actual build or submission has occurred.
