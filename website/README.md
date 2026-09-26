# Polka — landing page i lista oczekujących

`index.html` to responsywna strona Polki oparta o aktualną paletę berry `#C84F7A` / plum `#B94B7C`.

**Dokumenty `privacy.html` i `terms.html` są oznaczone jako wersja 1.0 z 26.09.2026, a `config.legalApproved=true`. Przed produkcyjnym ruchem nadal zweryfikuj, że publiczna domena HTTPS faktycznie serwuje te pliki.**

## Backend — projekt Polka, bez MyCampus

1. W pustym Supabase uruchom kolejno `supabase/MYGIRL_FRESH_INSTALL.sql`, `supabase/AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql`, `supabase/AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql`. Nie uruchamiaj historycznych migracji 001–003. Zrób kopię i testy RLS na osobnym projekcie.
2. W Auth → Providers włącz e-mail i potwierdzanie adresów. Ustaw szablon e-mail OTP, aby zawierał `{{ .Token }}` (formularz wymaga 6–8 cyfr), skonfiguruj własny dostawca SMTP, limity antyspamowe i właściwy Site URL / przekierowania HTTPS. Test: nowy adres i istniejący adres, zły kod, wygaśnięcie kodu, ponowne wysłanie.
3. Polityka prywatności i regulamin są przygotowane jako wersja 1.0. Po każdej zmianie zakresu danych zaktualizuj oba dokumenty oraz wersje w `config.js`.
4. Klucza `service_role` ani sekretów dostawców nigdy nie umieszczaj na WWW ani w Expo.
6. Wgraj katalog `website/` na HTTPS (dowolny hosting statyczny), ustaw prawdziwy e-mail pomocy, zweryfikuj linki, cookies/retencję sesji, meta i wygląd iPhone/Android/desktop, dostępność klawiaturą i rzeczywiste potwierdzenie kodu. Przetestuj z dwoma kontami i scenariusze ponownego zapisu. Dodaj ochronę przed masowym tworzeniem kont i kontrolę kosztów wiadomości e-mail.

## Przepływ użytkowniczki

1. E-mail, miasto, oświadczenie 18+, akceptacja regulaminu + potwierdzenie zapoznania się z informacją, **osobna opcjonalna** zgoda marketingowa.
2. Supabase Auth `signInWithOtp` wysyła kod; użytkowniczka wpisuje kod i `verifyOtp` tworzy sesję z potwierdzonym e-mailem.
3. Dopiero po weryfikacji klient zapisuje swój wiersz do `waitlist`; RLS i helper 005 wymagają potwierdzonego e-maila i zatwierdzonych wersji dokumentów.
4. Trigger zapisuje wersje dokumentów w `legal_acceptances` i zdarzenie zgody w `consent_events`. Admin może zapraszać wyłącznie przez zaufany backend, nie z poziomu klienta.

Uwaga: webowa rejestracja tworzy też konto w Supabase Auth (nie tylko rekord listy). Przed uruchomieniem zdecyduj, jak obsłużyć wycofanie zgody, rezygnację z zapisu, usuwanie konta i konta utworzone bez finalnego zapisu. Samo skasowanie wiersza `waitlist` nie usuwa konta Auth. `account_deletion_requests` bez działającego workera to wyłącznie kolejka.

## Status techniczny

Projekt Polka w Supabase jest aktywny. Dokumenty prawne v1.0 są przygotowane w repo. Przed wysyłką do sklepów nadal wykonaj test builda i TestFlight, zweryfikuj publiczne URL-e HTTPS, moderację, App Privacy/Data Safety oraz pełny test usuwania konta.