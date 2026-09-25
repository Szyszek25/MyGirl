# Polka — iOS release runbook

## Stan po rebrandzie
Kod aplikacji jest przygotowywany pod markę Polka i bundle identifier `pl.polka.app`.

To NIE oznacza jeszcze gotowości do publicznego App Store. Przed buildem produkcyjnym muszą działać prawdziwe: auth, moderacja, zgłoszenia, blokowanie, usunięcie konta i polityka prywatności.

## 1. Lokalna weryfikacja
```bash
npm install
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform ios
```

GitHub Actions uruchamia też smoke test bundle dla iOS i Androida po zmianach w aplikacji.

## 2. Apple Developer / App Store Connect
Potrzebne:
- aktywne płatne Apple Developer Program,
- App ID / Bundle ID zgodny z `pl.polka.app`,
- nowa aplikacja w App Store Connect,
- poprawna nazwa Polka, SKU i domyślny język,
- finalna polityka prywatności i support URL.

Jeśli `pl.polka.app` jest niedostępny, zmień bundleIdentifier przed pierwszym produkcyjnym buildem. Po publikacji nie traktuj zmiany bundle ID jako zwykłego rebrandu — tożsamość aplikacji jest z nim związana.

## 3. EAS
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

Po utworzeniu rekordu w App Store Connect dodaj jego Apple ID jako `submit.production.ios.ascAppId` w `eas.json`.

## 4. TestFlight
```bash
eas submit --platform ios --profile production
```

Po przetworzeniu buildu:
- dodaj testerów wewnętrznych,
- przetestuj onboarding, plany, publikację, blokowanie, report, delete account,
- przetestuj linki privacy/support,
- sprawdź zachowanie offline, błędy sieci i odmowę uprawnień do zdjęć.

## 5. App Store listing
Uzupełnij:
- opis i słowa kluczowe,
- kategorię,
- screenshoty,
- age rating questionnaire,
- App Privacy questionnaire,
- kontakt review team,
- review account,
- privacy policy URL,
- support URL,
- informacje wymagane lokalnie dla dystrybucji w UE.

## 6. Release gate
Nie wysyłaj do App Review, jeśli:
- report tylko zapisuje się lokalnie,
- konto nie może zostać usunięte z poziomu aplikacji,
- moderator nie ma realnej kolejki zgłoszeń,
- UGC może pojawić się publicznie bez właściwych zabezpieczeń,
- używane są stockowe fikcyjne profile jako rzekomi prawdziwi użytkownicy,
- brak prawdziwych URL-i privacy/support.

## 7. Submission
Po przejściu TestFlight i checklisty wybierz build w App Store Connect i wyślij do App Review.

EAS Submit wgrywa build do App Store Connect/TestFlight; samo publiczne wydanie nadal wymaga ukończenia metadanych i wysłania wersji do App Review.
