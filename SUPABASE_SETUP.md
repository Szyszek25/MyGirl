# MyGirl — osobny Supabase (Free)

Status: repo przygotowane, ale NOWY projekt Supabase nie został jeszcze podłączony. Nie stosowano migracji, nie uruchamiano testów RLS ani prawdziwego logowania. Nie używać bazy MyCampus.

## Pierwsze kroki
1. Utwórz NOWY projekt `MyGirl` w oddzielnej organizacji/konto Supabase Free. Region dobierz świadomie do odbiorców w Polsce (np. dostępny region UE). Nie przesyłaj nikomu hasła do konta ani database password w czacie.
2. Połącz nowe konto/projekt przez integrację Supabase w ChatGPT, tak aby projekt był jednoznacznie widoczny. Nie modyfikuj żadnego innego projektu.
3. Najpierw przejrzyj SQL w `supabase/migrations/`, wykonaj obie migracje po kolei tylko na nowym projekcie. Zweryfikuj polityki RLS przy pomocy dwóch kont testowych, w tym blokad w obie strony. Dla profili pozostałych osób nie eksponuj e-maila ani dokładnej lokalizacji.
4. Skopiuj `.env.example` do `.env.local`; ustaw wyłącznie URL i publishable key z panelu nowego projektu. Nie commituj `.env.local` ani kluczy secret/service_role/DB password. Klucz publishable jest publiczny, więc każda tabela i bucket wymagają prawidłowego RLS.
5. Dopiero po sprawdzeniu migracji dodaj kompatybilne zależności przez `npx expo install @supabase/supabase-js react-native-url-polyfill expo-sqlite`, skonfiguruj klienta, sesję i przepływ auth. Nie udawaj działającego logowania przed testami urządzenia.

## Zakres przygotowanego SQL
- `profiles`: podstawowe, publicznie odkrywalne dopiero po onboardingu, bez e-maili i geolokalizacji.
- `profile_interests`: powiązane zainteresowania z prawem edycji tylko dla właścicielki.
- `blocks`: prywatne relacje blokowania; wzajemne blokady respektowane w odkrywaniu i zaproszeniach.
- `friend_requests`: wysłanie/odrzucenie przez usunięcie, bez akceptacji (do zaprojektowania atomowy RPC z testami uprawnień).

## Przed publicznym uruchomieniem
- Uzupełnić politykę wieku i dostępu, zgody, regulamin, politykę prywatności, przechowywanie i usuwanie danych.
- Dodać raportowanie, moderację, blokowanie w czatach/feedzie, ograniczenia spamu i usuwanie kont.
- Zaprojektować bezpieczny upload zdjęć z restrykcjami bucketu i moderacją, trwałe czaty oraz rozdział uprawnień.
- Przetestować RLS na różnych tożsamościach, utrzymywanie sesji, upload i testy na Androidzie/iOS.
- Bez produkcyjnych danych dopóki powyższe nie jest kompletne.

Free tier jest odpowiedni do prototypu, lecz ma limity i może automatycznie pauzować projekt przy niskiej aktywności. Monitoruj metryki i planuj upgrade przed większym ruchem.
