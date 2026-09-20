# MyGirl 🌸

Mobilna aplikacja społecznościowa dla dziewczyn w Polsce — **prototyp Expo Go**.

## Uruchomienie

Wymagany Node.js 22.13+ i zalogowana aplikacja Expo Go na telefonie.

```bash
npm install
npx expo install --fix
npx expo start --tunnel
```

Zeskanuj kod QR w Expo Go (Android) lub aparatem iPhone'a. `--tunnel` pomaga przy różnych sieciach.

## Co działa

- Ekran powitalny z wyborem miasta i imienia.
- Odkrywanie przykładowych profili, filtr miasta i zainteresowań, lokalne polubienia.
- Grupy tematyczne, przykładowe wydarzenia i ekran profilu.
- Nawigacja między czterema zakładkami.

**Ważne:** to lokalny, klikalny prototyp. Konta, wydarzenia i grupy są fikcyjnymi danymi demonstracyjnymi; brak backendu, prawdziwej weryfikacji, wiadomości, logowania, przechowywania danych i rzeczywistych zaproszeń. Nie publikuj jako działającej sieci społecznościowej przed dodaniem autentykacji, moderacji, zgłoszeń, blokowania użytkowników i ochrony danych.

## Stack

Expo SDK 57 (stabilny), React Native, JavaScript. Projekt bez dodatkowych natywnych modułów — uruchamiany w Expo Go.
