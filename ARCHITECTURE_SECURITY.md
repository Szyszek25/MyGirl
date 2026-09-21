# MyGirl — architektura, bezpieczeństwo i operacje

**Status: projekt techniczny + pliki SQL w repozytorium; NIE wdrożono ani nie przetestowano na żywej bazie.** Tylko oddzielny, nowy projekt Supabase. Nie kopiować danych, tokenów, ról ani triggerów MyCampus. Obecne ekrany aplikacji w większości używają danych demo i stanu w pamięci; nie mylić tego z połączoną produkcją.

## 1. Mapa produktu i tabel

| Obszar | Tabele | Kluczowe zasady |
|---|---|---|
| Auth | zarządzane przez Supabase `auth.users` | Konta, potwierdzanie e-mail, sesje; nigdy własna tabela haseł. |
| Onboarding / profile | `profiles`, `profile_interests` | `profiles.id = auth.users.id`; wrażliwa data urodzenia poza dostępnymi kolumnami SELECT; datę własną czyta odrębne bezparametrowe RPC; profil opublikowany wyłącznie dla deklarowanych 18+. |
| Odkrywanie / kontakty | `blocks`, `friend_requests` | Ochrona przed własnymi zaproszeniami, duplikatami, blokowaniem obu kierunków przez scoped SQL helper. Akceptacja zaproszenia i realna relacja znajomych wymagają osobnego projektu stanu i implementacji — obecny schemat ich jeszcze NIE realizuje. |
| Społeczność | `posts`, `post_likes`, `comments` | Autor usuwa swoje treści; wpisy i komentarze startują jako `pending`; zatwierdzanie tylko przez zaufany backend. |
| Grupy | `groups`, `group_members` | Właściciel i status moderacji, członkostwo; prywatne grupy, role adminów i weryfikacja społeczności nie są jeszcze wdrożone. |
| Czaty | `conversations`, `conversation_participants`, `messages` | Zakładanie pokojów i uczestników wyłącznie na serwerze; dostęp tylko uczestników; wiadomości `pending` i wymagają procesu moderacji. Nie ma jeszcze produkcyjnego czatu w aplikacji. |
| Bezpieczeństwo | `reports`, `blocks` | Prywatne zgłoszenia; kolejka moderacji i panel administratora do wdrożenia; nie udawać automatycznej moderacji. |
| Zapisy | `waitlist`, `legal_documents`, `legal_acceptances`, `consent_events` | Potwierdzony e-mail w Auth; RLS własnego wiersza; wersjonowane dokumenty i osobne zdarzenia zgody marketingowej. Dokumenty domyślnie NIEOPUBLIKOWANE. |
| Usuwanie | `account_deletion_requests` | Tylko zgłoszenie; zaufany worker musi realnie usunąć dane Storage i Auth, zgodnie z okresem retencji; nie nazywać samego wpisu pełnym usunięciem. |

## 2. Kolejność zainstalowania w NOWYM projekcie

1. `supabase/MYGIRL_FRESH_INSTALL.sql` **raz** — zastępuje historyczne migracje 001–003.
2. `supabase/AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql` — prywatne buckety i lista oczekujących.
3. `supabase/AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql` — poprawki bezpieczeństwa, publikacja wersji prawnych, ślad zgód, żądanie usunięcia konta.

**Nie uruchamiać 001–003 po bootstrapie ani żadnego z tych skryptów na MyCampus.** Skrypty przeznaczone są dla pustej bazy; brak gwarancji idempotencji. Najpierw uruchomić lokalnie przez Supabase CLI na tymczasowym projekcie, następnie wykonać testy migracji, RLS i przywracania backupu. Rewizję zgód/bucketów trzeba zrobić przed dodaniem prawdziwych użytkowniczek. W żadnym wypadku nie obchodzić RLS przez `session_replication_role`.

## 3. Autoryzacja i przechowywanie loginów

- Supabase Auth: e-mail OTP z potwierdzeniem adresu (na stronie landingowej), w aplikacji docelowo zgodny z Apple OAuth i/lub e-mail OTP. Hasła i kodów OTP **nigdy** nie przechowywać w `public`, logach ani repo.
- Na stronie `website/config.js` umieszcza się TYLKO URL i klucz publishable. Supabase secret/service-role, Resend/email API key, klucze Apple, hasło DB i klucze JWT wyłącznie jako sekrety backendu / EAS. Klucz service-role omija RLS — nigdy w aplikacji i HTML.
- W Expo sesje przechowywać w bezpiecznym adapterze (np. Expo SecureStore), skonfigurować odświeżanie tokenów z AppState, głębokie linki/redirect URI, wylogowanie, anulowanie sesji po usunięciu konta. Zweryfikować obsługę OAuth/Apple na prawdziwym iOS; brak implementacji w aktualnym demo.
- W panelu Supabase włączyć wymagane potwierdzenie e-mail i ograniczenia OTP. Dla 6-cyfrowego formularza HTML szablon maila powinien zawierać `{{ .Token }}`; domyślny szablon linku może nie dostarczyć kodu. Sprawdzić SMTP, spam, limity i rate-limiting; nie używać masowej wysyłki z domyślnego mailera bez weryfikacji limitów.
- Hasło do konta Supabase przekazuje się wyłącznie przez oficjalne połączenie usługi; **nie przesyłać go w czacie**.

## 4. RLS i dostępy

- `anon`: żadnych publicznych operacji na profilach, postach, zgłoszeniach i liście. Wyjątek: odczyt opublikowanych metadanych wersji dokumentów prawnych.
- `authenticated`: minimalne uprawnienia kolumnowe i RLS. Własny profil/zgody/zapis, własne posty, posty zatwierdzone dostępnych autorów; blokady ukrywają profile i relacje. Trzeba zweryfikować ścieżki po blokowaniu także dla grup i czatów w testach wieloosobowych.
- `service_role`: wyłącznie serwer, do moderacji, zaproszeń i kasowania auth/plików. W niektórych obecnych tabelach przyznane są szerokie GRANTy, ale bez polityki operacje pozostają zabronione; przed produkcją audyt pełnej macierzy GRANT + RLS, w tym `UPDATE` statusów i przypisywania autorów.
- `SECURITY DEFINER`: kwalifikować obiekty pełną nazwą, `search_path=''`, odebrać `EXECUTE` od PUBLIC i przydzielać wyłącznie niezbędne role; nie dodawać funkcji przyjmujących dowolny `user_id` do zwracania wrażliwych danych.
- Testy minimum: anon, A, B i moderator; A blokuje B, B blokuje A; próba odczytu profilu, posta, zdjęcia, wiadomości, zaproszenia; próby zmiany autora/statusu; nieautoryzowane kasowanie; próby zapisania z niezweryfikowanego e-maila; weryfikacja RLS dla Storage. Potwierdzić, że oba kierunki blokady wyłączają prywatne rozmowy, również istniejące.

## 5. Storage, zdjęcia i wydajność

Trzy **prywatne** buckety z 004:

- `mygirl-avatars` — limit 5 MiB, JPG/PNG/WebP; nazwa `auth.uid()/random_name.webp`; odczyt własnego albo avatara profilu widocznego przez RLS.
- `mygirl-post-media` — limit 8 MiB; odczyt własnego lub mediów zatwierdzonych widocznych postów.
- `mygirl-group-media` — limit 5 MiB; odczyt własnego lub okładki zatwierdzonej widocznej grupy.

Brak polityki UPDATE/UPSERT: po zatwierdzeniu pliku nie można podmienić pod tą samą ścieżką. Na etapie klienta kompresować do WebP/JPEG, ograniczać rozdzielczość i liczbę zdjęć oraz wczytywać miniatury, nie całe oryginały. Ścieżki zapisywać w DB, nie publiczne i wygasające signed URL. URL podpisywać na krótko po sprawdzeniu uprawnień i nie cache'ować nieograniczenie. MIME i rozmiar walidować również po stronie serwera — nagłówek pliku może być sfałszowany. Nie udostępniać publicznych bucketów zdjęć profili bez świadomej decyzji o prywatności.

**Uwaga:** polityka DELETE pozwala właścicielowi usunąć obiekt, nawet gdy przypomina on zatwierdzony post — może to zostawić pusty obraz; sprzątanie osieroconych plików i aktualizacja ścieżek to zadanie backendu. Trzeba dodać skanowanie nadużyć i moderację zdjęć.

## 6. Regulamin, prywatność i zgody

- Wersjonowane pliki źródłowe publikować jako `website/privacy.html`, `website/terms.html` dopiero po uzupełnieniu danych administratora, celów, podstaw prawnych, dostawców, transferów, retencji, procedur praw i kontaktu. **Aktualne pliki są wyraźnie oznaczonymi PROJEKTAMI, nie dokumentami produkcyjnymi.**
- Proces publikacji: przegląd prawny -> własna domena HTTPS -> finalne pliki -> obliczenie SHA-256 ich treści -> wprowadzenie do `legal_documents` pozycji `privacy` i `terms` z wersją, finalnym adresem, SHA-256, `published_at` -> te same wersje w `website/config.js` i `legalApproved: true` dopiero po testach.
- Wiersz `waitlist` przechowuje `privacy_notice_version`, `terms_version`, opcjonalną `marketing_opt_in`; trigger 005 zapisuje niezmienne `legal_acceptances` i `consent_events`. Dodatkowy marketing jest niezależny od potwierdzenia listy i powinien mieć tak samo prosty mechanizm wycofania. Serwerowy zapis kontekstu zgody/wersji jest do wdrożenia i audytu.
- Przed startem określić okres usuwania zapisów po uruchomieniu projektu, logów, zgłoszeń, wiadomości i backupów; dokumentacja musi odpowiadać realnej konfiguracji. Nie przypisywać automatycznie zgody marketingowej wszystkim użytkowniczkom.
- Obecny frontend nie ma kompletnego mechanizmu rezygnacji z listy, a aplikacja nie ma działającego usuwania konta. Dlatego lista jest **domyślnie zablokowana** flagą `legalApproved:false`.

## 7. Moderacja i App Store

Apple wymaga realnego filtrowania treści UGC, zgłaszania, blokowania użytkowników i kontaktu. Obecne tabele `pending` chronią widoczność dopóki serwer nie zatwierdzi treści, ale nie ma jeszcze panelu moderatora ani SLA. Potrzebne są: kolejka, log działań, eskalacja, procedury odwołań, usuwanie własnych postów, wiadomości i grup zgodnie z uprawnieniami, zgłoszenia z tekstem i kategorią, rate limits, zasady społeczności oraz monitorowanie abuse. Nie uruchamiać publicznej sieci przed tym etapem.

Apple wymaga inicjowania usunięcia konta w aplikacji; docelowo profil → ustawienia → usuń konto → potwierdź → uwierzytelniony backend czyści pliki, powiązania i usuwa `auth.users` (z wyjątkiem danych, które prawo nakazuje przechować — te trzeba objaśnić). `account_deletion_requests` to KOLEJKA, nie dowód usunięcia. Przetestować rejestrację, login, blokowanie, moderację, cofnięcie zgód i kasowanie na dwóch urządzeniach przed TestFlight.

## 8. Status i blokery

Kod SQL oraz landing są zapisane w GitHubie, ale nie były uruchamiane w Supabase, w przeglądarce produkcyjnej ani przez testy automatyczne. Nie ma potwierdzonej licencji na poglądowe zdjęcie na stronie — wymień je na własny/licencjonowany materiał przed publikacją. Nie podano zweryfikowanego administratora danych, domeny MyGirl, e-maila pomocy, okresów retencji, tekstów prawnych ani nowego projektu Supabase. Nie twierdź, że zapisy, moderacja, powiadomienia, App Store czy prywatność są już w pełni gotowe.
