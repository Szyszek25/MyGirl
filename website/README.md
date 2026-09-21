# MyGirl — landing page i lista oczekujących

`index.html` to lekka polska, responsywna strona statyczna. Duże nagłówki, róż `#D72B78`, jasne tło `#FFF9FC`, ciemny tekst `#261522`, DM Sans + Playfair Display; bez zmyślonych statystyk i fałszywych profili. Poglądowy portret z zewnętrznego Unsplash trzeba zastąpić obrazem o zweryfikowanych prawach i zgodzie modelki przed publiczną kampanią.

**Nie wdrożono na domenie ani nie uruchomiono zapisów.** Domyślnie `config.legalApproved=false`, a URL/key to placeholdery. Formularz pokazuje wyraźny błąd i nie wysyła adresu, dopóki konfiguracja nie jest zatwierdzona.

## Backend — NOWY projekt MyGirl, bez MyCampus

1. W pustym Supabase uruchom kolejno `supabase/MYGIRL_FRESH_INSTALL.sql`, `supabase/AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql`, `supabase/AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql`. Nie uruchamiaj historycznych migracji 001–003. Zrób kopię i testy RLS na osobnym projekcie.
2. W Auth → Providers włącz e-mail i potwierdzanie adresów. Ustaw szablon e-mail OTP, aby zawierał `{{ .Token }}` (formularz wymaga 6–8 cyfr), skonfiguruj własny dostawca SMTP, limity antyspamowe i właściwy Site URL / przekierowania HTTPS. Test: nowy adres i istniejący adres, zły kod, wygaśnięcie kodu, ponowne wysłanie.
3. Uzupełnij `privacy.html` i `terms.html` danymi rzeczywistego administratora, zweryfikowanym kontaktem, retencją, podwykonawcami i zgodami. Uzyskaj wymagany przegląd prawny. Wdróż osobny, działający sposób usunięcia zgłoszenia/konta i wycofania marketingu. Dopiero wtedy opublikuj pliki na własnej domenie HTTPS i policz SHA-256 każdej finalnej wersji dokumentu.
4. W SQL Editor dodaj po jednej zatwierdzonej pozycji do `public.legal_documents` dla `privacy` i `terms`: `kind`, `version`, `document_url` (publiczny HTTPS), `sha256` (64 małe znaki hex), `published_at` (data publikacji). Dokumentów nie publikujemy automatycznie. Przetestuj, że brak wersji lub niepotwierdzony e-mail blokuje zapis.
5. W `config.js` ustaw URL **nowego** projektu i jego klucz publishable, finalne wersje dokumentów i dopiero po spełnieniu poprzednich punktów `legalApproved:true`. Klucza service_role i sekretów nigdy nie umieszczaj na WWW ani w Expo.
6. Wgraj katalog `website/` na HTTPS (dowolny hosting statyczny), ustaw prawdziwy e-mail pomocy, zweryfikuj linki, cookies/retencję sesji, meta i wygląd iPhone/Android/desktop, dostępność klawiaturą i rzeczywiste potwierdzenie kodu. Przetestuj z dwoma kontami i scenariusze ponownego zapisu. Dodaj ochronę przed masowym tworzeniem kont i kontrolę kosztów wiadomości e-mail.

## Przepływ użytkowniczki

1. E-mail, miasto, oświadczenie 18+, akceptacja regulaminu + potwierdzenie zapoznania się z informacją, **osobna opcjonalna** zgoda marketingowa.
2. Supabase Auth `signInWithOtp` wysyła kod; użytkowniczka wpisuje kod i `verifyOtp` tworzy sesję z potwierdzonym e-mailem.
3. Dopiero po weryfikacji klient zapisuje swój wiersz do `waitlist`; RLS i helper 005 wymagają potwierdzonego e-maila i zatwierdzonych wersji dokumentów.
4. Trigger zapisuje wersje dokumentów w `legal_acceptances` i zdarzenie zgody w `consent_events`. Admin może zapraszać wyłącznie przez zaufany backend, nie z poziomu klienta.

Uwaga: webowa rejestracja tworzy też konto w Supabase Auth (nie tylko rekord listy). Przed uruchomieniem zdecyduj, jak obsłużyć wycofanie zgody, rezygnację z zapisu, usuwanie konta i konta utworzone bez finalnego zapisu. Samo skasowanie wiersza `waitlist` nie usuwa konta Auth. `account_deletion_requests` bez działającego workera to wyłącznie kolejka.

## Status testów

Nie wykonano instalacji SQL na serwerze, testów przeglądarki, testów na telefonie, e-mail delivery ani wdrożenia domeny. Nie przedstawiaj lokalnego kodu jako aktywnego formularza. Szczegółowy audyt: `../ARCHITECTURE_SECURITY.md`.
