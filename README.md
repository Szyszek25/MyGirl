# MyGirl 🌸

Mobilny prototyp społecznościowy dla dziewczyn w Polsce, zbudowany w Expo / React Native. **To nie jest jeszcze usługa produkcyjna ani aplikacja opublikowana w App Store.** Wszystkie osoby, wpisy, czaty i grupy są fikcyjnymi danymi demonstracyjnymi.

## Uruchomienie

```bash
npm install
npx expo install --check
npx expo start --tunnel
```

Jeśli `expo install --check` zgłasza konflikt wersji, dopasuj zależności do zainstalowanego SDK przez `npx expo install --fix` i powtórz sprawdzenie. Kod nie został jeszcze przetestowany na urządzeniu ani w Expo Snack.

## Architektura

- `App.js` — główny przepływ i pięć zakładek.
- `src/theme.js` — **jedyne miejsce** z paletą, czcionkami, rozmiarami, odstępami, promieniami i cieniem.
- `src/ui.js` — współdzielone Typography, Button, Field, Chip, Surface, PageHeading.
- `src/Onboarding.js` — siedem tradycyjnych kroków: wstęp, cel, miasto, zainteresowania, imię, zdjęcie (jeszcze niedostępne), informacja o demonstracji.
- `src/screens.js` — modułowe ekrany: Odkrywaj, Social, Grupy, Czaty, Profil.
- `src/data.js` — wyłącznie jawnie opisane fikcyjne dane i zewnętrzne ilustracyjne zdjęcia.
- `eas.json` — szablony profili EAS; `APP_STORE_CHECKLIST.md` — lista blokad przed publikacją.

## Co działa w prototypie

Onboarding, filtrowanie miasta, swipe i lokalne polubienia, tworzenie demonstracyjnych wpisów, dołączanie do grup, symulowane czaty oraz profil. Stan żyje wyłącznie w pamięci. Zdjęcia ładują się z internetu i mogą być niedostępne offline.

## Ważne ograniczenia

Brak logowania, backendu, prawdziwych kont, weryfikacji, przesyłania zdjęć, powiadomień, moderacji, zgłoszeń i trwałej historii. Nie przedstawiaj demonstracyjnych funkcji jako rzeczywistych. Dolne zakładki nadal mają lekką nawigację w React Native; przejście na React Navigation / Expo Router i kontrola natywnych safe areas są na liście przed wdrożeniem.

Przed wysłaniem do App Store wykonaj `APP_STORE_CHECKLIST.md`; zweryfikuj pakiety pod SDK, bundle ID, prawa do zdjęć, prywatność i realny system kont. Nie wykonano jeszcze buildu ani publikacji.
