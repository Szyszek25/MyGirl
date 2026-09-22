# MyGirl — aplikacja na telefon (Expo / React Native)

## Wykonane w aplikacji mobilnej, wersja 0.4.0

- `App.js`: wczytuje lokalny profil przy ponownym uruchomieniu, zapisuje wynik onboardingu na urządzeniu, resetuje go z poziomu bezpieczeństwa.
- `src/Onboarding.js`: 8 ekranów, wybór celu, miasta, zainteresowań, imienia, pytań Gen Z, **rzeczywisty natywny wybór zdjęcia z galerii** i deklaracja 18+.
- `src/NativeProfile.js`: wyświetla zdjęcie, odpowiedzi i zainteresowania.
- `src/localProfile.js`: metadane profilu przez AsyncStorage, zdjęcie kopiowane do katalogu dokumentów aplikacji przez expo-file-system, kasowanie lokalnego profilu i zdjęcia.
- `app.json`: opis dostępu do galerii przez plugin expo-image-picker, brak potrzeby uprawnień mikrofonu i aparatu w tej funkcji.

## Rozróżnienie: lokalny profil ≠ prawdziwe konto

To **nie jest** internetowa rejestracja. Nie ma jeszcze nowego, skonfigurowanego projektu Supabase MyGirl, nie podłączono Supabase Auth ani Storage. Wybranie zdjęcia nie przesyła go na serwer. Onboarding i profil są natywne, ale pozostałe ekrany nadal posługują się danymi przykładowymi, a blokady, wiadomości i zgłoszenia są demonstracyjne. Deklaracja 18+ nie jest weryfikacją wieku. AsyncStorage nie szyfruje metadanych — nie zapisywać w nim tokenów ani sekretów.

## Co musi powstać, zanim aplikacja będzie usługą online

1. Nowy osobny projekt Supabase MyGirl, migracje SQL przetestowane dla co najmniej dwóch użytkowników, poprawne reguły Storage i RLS.
2. Supabase Auth z zarządzaniem sesją, bezpieczny upload zdjęć, usuwanie plików i kont po stronie serwera.
3. Prawdziwy feed, grupy, uczestniczki i czaty z kontrolą blokad w bazie i sprawną moderacją.
4. Opublikowane dokumenty prawne, kontakt wsparcia, procedura obsługi zgłoszeń, ochrona danych.
5. Testy Expo/Metro na urządzeniach, uruchomienie `npm install && npx expo install --check && npx expo-doctor`, test restartu i czyszczenia zdjęć, EAS i TestFlight. **Nie przeprowadzono jeszcze tych testów ani buildu.**

### Uruchomienie lokalnie

```bash
npm install
npx expo install --check
npx expo start
```

W razie zmiany uprawnień w konfiguracji potrzebny jest nowy development build; samo OTA nie zmienia natywnego manifestu uprawnień.
