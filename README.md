# MyGirl 🌸

MyGirl — projekt aplikacji społecznościowej dla pełnoletnich dziewczyn w Polsce. Repo zawiera **prototyp Expo / React Native**, polską stronę przedpremierową oraz schemat Supabase. Nie jest to jeszcze produkcyjna usługa ani aplikacja w App Store; profile, posty, grupy i rozmowy w aktualnym UI są demonstracyjne.

## Najważniejsze pliki

- [Strona internetowa / lista oczekujących](website/index.html) — duże nagłówki, różowy design, responsywny HTML, dwuetapowy e-mail OTP; formularz celowo nieaktywny przed konfiguracją i zatwierdzeniem dokumentów.
- [Instrukcja wdrożenia strony](website/README.md) — rzeczywiste kroki konfiguracji, legal i weryfikacji.
- [Architektura i bezpieczeństwo](ARCHITECTURE_SECURITY.md) — tabele, loginy, RLS, buckety, zdjęcia, zgody, konta, moderacja i testy.
- [Główny schemat świeżej bazy](supabase/MYGIRL_FRESH_INSTALL.sql).
- [004: Storage i zapisy](supabase/AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql).
- [005: hardening i wersje prawne](supabase/AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql).
- [Generator jednego pliku SQL](scripts/build-full-sql.mjs): `node scripts/build-full-sql.mjs` utworzy `supabase/MYGIRL_COMPLETE_INSTALL.sql` z trzech modułów w jednej transakcji. **W repo nie ma jeszcze wygenerowanego pliku; najpierw uruchom skrypt.**
- [Lista wymagań App Store](APP_STORE_CHECKLIST.md).

## Jak utworzyć NOWĄ bazę

W nowym, pustym projekcie Supabase uruchom moduły SQL w kolejności: główny `MYGIRL_FRESH_INSTALL.sql` → 004 → 005. Alternatywnie uruchom generator i użyj **wyłącznie** wygenerowanego `MYGIRL_COMPLETE_INSTALL.sql` (nie obu metod). Historyczne migracje 001–003 są zastąpione przez plik główny — nie uruchamiaj ich ponownie. **Nie wykonuj niczego na MyCampus**. Migracje nie zostały przetestowane ani wykonane na zdalnej bazie.

## Aplikacja Expo (demo)

```bash
npm install
npx expo install --check
npx expo start --tunnel
```

Jeśli `expo install --check` zgłasza konflikt wersji, zweryfikuj SDK i zależności z oficjalnym Expo, dopiero wtedy użyj `npx expo install --fix`. Test na urządzeniu i build iOS nie zostały jeszcze wykonane; sprawdź kompatybilność Expo Go z używanym SDK.

- `App.js` — główny przepływ, pięć demonstracyjnych zakładek.
- `src/theme.js` — centralne tokeny: paleta, fonty, typografia, spacing, promienie, cienie.
- `src/ui.js` — współdzielone komponenty.
- `src/Onboarding.js` — tradycyjny onboarding (zdjęcie jeszcze niewdrożone).
- `src/screens.js`, `src/Safety.js`, `src/data.js` — ekrany, demonstracyjne funkcje bezpieczeństwa, fikcyjne dane.

**Przed publicznym uruchomieniem:** realne logowanie i bezpieczne sesje, integracja aplikacji z backendem, prawa do zdjęć, moderacja, kompletna obsługa zgłoszeń i blokad, faktyczne usuwanie konta, finalne polityka prywatności/regulamin, testy RLS i urządzeń, TestFlight, podpisanie i zgłoszenie do App Store. Nie przedstawiać demo jako aktywnej społeczności.
