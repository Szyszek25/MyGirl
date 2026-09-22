# MyGirl — mobilna aplikacja Expo / React Native

## Stan: wersja kodu 0.4.1, NIE wydanie produkcyjne

Zmiany dotyczą wyłącznie aplikacji telefonicznej w `App.js` i `src/`, a nie przeglądarkowego playgroundu.

### Mobilny przepływ
- `App.js`: `SafeAreaProvider` + `SafeAreaView` z `react-native-safe-area-context`; dolny pasek uwzględnia `useSafeAreaInsets().bottom`, a ekrany pełnoekranowe i onboarding uwzględniają dolny bezpieczny obszar.
- `src/ShiftTransition.js`: krótka animacja przesunięcia i zanikania przy zmianie zakładki; uwzględnia systemowe ograniczenie animacji (`reduce motion`). To animacja nawigacji, nie mechanika sprintu z dołączonego kodu gry MyCampus.
- `src/DiscoverScreen.js`: natywny ekran odkrywania, `expo-image` z `memory-disk`, prefetch następnego zdjęcia na dysk, zgodny sterownik animacji JS dla gestów PanResponder. Fotografie profili nadal są ilustracjami, nie rzeczywistymi użytkowniczkami.
- `src/Onboarding.js`, `src/NativeProfile.js`, `src/localProfile.js`: lokalny onboarding z pytaniami Gen Z, galeria urządzenia, zapis lokalnego zdjęcia i danych. Brak prawdziwego logowania.
- `src/PartnerPanel.js`: dostępny przez Profil → Panel organizacji i biznesu. Wizytówka kawiarni, organizacji lub koła, lokalna propozycja i podgląd. **Nie publikuje ofert i nie tworzy kont firmowych.**
- `src/cache.js`: wersjonowany i ograniczony rozmiarem cache niepoufnych szkiców z czasem wygaśnięcia; szkic partnera wygasa najpóźniej po 7 dniach i jest kasowany wraz z lokalnym profilem. Nie przechowuj tu tokenów, wiadomości, zdjęć ani wrażliwych danych.

### Rozszerzenie modelu danych
`supabase/AFTER_FRESH_INSTALL_007_PARTNERS.sql` projektuje organizacje, członkostwa z rolami, oferty i zgłoszenia partnerów. W nowej bazie uruchamiaj po 004–006 albo użyj generatora `node scripts/build-full-sql.mjs` dla PUSTEGO, dedykowanego projektu MyGirl. Nie uruchamiaj generatora SQL na MyCampus. **Migracja 007 nie była wykonana i polityki nie przeszły testów integracyjnych.** Własność organizacji, nadawanie ról i moderacja muszą działać przez zaufany backend, nie telefon.

### Testy
`npm test` uruchamia pięć testów jednostkowych cache na podmienionym AsyncStorage. Lokalny test Node na kopii tego samego modułu przeszedł 5/5. **To nie jest test aplikacji na urządzeniu ani test pełnego repozytorium.** Brak sieci do pobrania npm i brak środowiska iOS/Android w sesji — `npm install`, `expo-doctor`, Metro, EAS i TestFlight pozostają do wykonania.

```bash
npm install
npm test
npm run check
npx expo start
```

Zweryfikuj na iPhonie i Androidzie: notch/status bar, dolny wskaźnik gestów, klawiaturę, przejścia przy Reduce Motion, dwukrotny szybki swipe, restart i usunięcie danych, cache po 7 dniach oraz formularz panelu. Po zmianie pakietów natywnych zbuduj nowy development build.

## Blokady publikacji

Nie ma jeszcze osobnego działającego Supabase MyGirl ani wdrożonego Auth/Storage, weryfikacji organizacji, moderacji, kont i wiadomości online, RLS przetestowanego z dwoma kontami, produkcyjnego usuwania konta, opublikowanych dokumentów prawnych ani zweryfikowanych testów na urządzeniach. Funkcji lokalnych nie przedstawiać jako produkcyjnych.
