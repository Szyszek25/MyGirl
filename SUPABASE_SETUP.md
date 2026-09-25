# Polka — Supabase (Free)

Status: dedykowany projekt `Polka` (`jnygupsfbkpqvoewrxpf`, `eu-central-1`) jest utworzony i migracje 001–007 są wdrożone. Expo używa Supabase Auth, Storage i Realtime. Nie używać bazy MyCampus.

## Pierwsze kroki
1. Projekt Supabase: `Polka`, region `eu-central-1`, ref `jnygupsfbkpqvoewrxpf`.
2. Klient Expo używa publishable key z `.env.example`; nigdy nie umieszczaj `service_role`, secret key ani hasła DB w aplikacji.
3. Migracje w `supabase/migrations/` są źródłem prawdy dla schematu. Każdą kolejną zmianę zapisuj jako nową migrację i stosuj przez Supabase.
4. OAuth Google wymaga włączenia providera w Supabase Auth oraz Google Client ID/Secret. Redirect aplikacji: `polka://auth/callback`; reset hasła: `polka://auth/reset-password`; callback Google do Supabase: `https://jnygupsfbkpqvoewrxpf.supabase.co/auth/v1/callback`.
5. Po zmianach Auth/Storage/Realtime zawsze sprawdzaj RLS na dwóch realnych kontach testowych.

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
