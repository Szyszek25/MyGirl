# MyGirl — interaktywny prototyp lokalny

Otwórz `playground.html` w przeglądarce, najlepiej przez lokalny serwer statyczny. Dostęp do kodu: https://github.com/Szyszek25/MyGirl/blob/main/website/playground.html

## Co przetestować

1. Utwórz pierwszy profil (minimum 18 lat); możesz wybrać zdjęcie z urządzenia. Zdjęcie zostaje zmniejszone do maksymalnie 650 pikseli na dłuższym boku i zapisane jako lokalny JPEG.
2. Użyj przycisku `+ Nowy profil`, utwórz drugie konto demonstracyjne. Przełączaj się między profilami selektorem w nagłówku — **bez uwierzytelniania**; każda osoba korzystająca z tej samej przeglądarki może przełączyć profil.
3. W Odkrywaj sprawdź profile i odpowiedzi na pytania w stylu Gen Z. Możesz napisać wiadomość, zablokować profil lub zgłosić go lokalnie.
4. W Social dodaj tekst lub zdjęcie, a następnie przełącz konto. Drugi profil zobaczy wpis, może go zgłosić albo zablokować autora. Autor może usunąć swój wpis.
5. W Czatach wyślij wiadomość, przełącz profil i odpisz; odbiorca może zgłosić wiadomość. Blokada ukrywa konwersację po obu stronach.
6. W Profilu edytuj zdjęcie i odpowiedzi, sprawdź lokalne blokady/zgłoszenia, odblokuj oraz usuń konto demonstracyjne lub wszystkie dane.

## Ograniczenia bezpieczeństwa

- `localStorage` przechowuje zdjęcia i dane w przeglądarce na danym urządzeniu; to nie jest baza kont, bezpieczne uwierzytelnianie ani szyfrowane repozytorium danych. Nie używać w produkcji.
- Zgłoszenia nie trafiają do moderatorów. Wiadomości są dostępne tylko przy przełączaniu demonstracyjnych profili w tej samej przeglądarce; nie są wysyłane do innych urządzeń.
- Blokowanie i kasowanie dotyczy wyłącznie lokalnego prototypu. Usunięcie prawdziwego konta Supabase wymaga odrębnej zabezpieczonej funkcji serwerowej.
- Nie umieszczaj danych osobowych ani wrażliwych w demonstracji. Nie publikuj prototypu jako prawdziwej aplikacji społecznościowej.
- Nie wykonano testów przeglądarkowych ani produkcyjnego audytu bezpieczeństwa. Przed wdrożeniem należy podłączyć auth/RLS, Storage, moderację, odpowiedni regulamin i politykę prywatności.
