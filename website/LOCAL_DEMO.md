# MyGirl — lokalne demo w przeglądarce

Otwórz `website/demo.html` w przeglądarce albo opublikuj folder `website/` jako statyczną stronę na testowej domenie. To osobna demonstracja WWW, **nie implementacja rejestracji w natywnej aplikacji Expo**.

## Funkcje
- Tworzenie lokalnego profilu (imię, miasto, cel i deklaracja 18+). Bez hasła, maila, Supabase Auth ani identyfikacji użytkowniczki.
- Dodawanie / zmiana pliku JPG, PNG lub WebP do 5 MB. Obraz zostaje pomniejszony do maks. 720 px i skompresowany, a następnie zapisany w `localStorage`; nie jest wysyłany na serwer.
- 6 pytań do profilu w stylu Gen Z: green flag u znajomej, piątkowe plany, comfort spot, hot take, obecne zajawki i wolna sobota. Użytkowniczka wypełnia własne odpowiedzi; nie ma fikcyjnych osób podszywających się pod realne konto.
- Wybór zainteresowań, tworzenie i usuwanie własnych lokalnych wpisów.
- Testowy ekran wiadomości jako **notatki do siebie**, bez pozorowania wysyłki do innych osób.
- Usunięcie lokalnego profilu, zdjęcia, wpisów i wiadomości jednym przyciskiem.

## Ograniczenia i bezpieczeństwo
- Wszystkie dane pozostają na urządzeniu w jednej przeglądarce. Nie używaj danych wrażliwych ani cudzych zdjęć. `localStorage` nie jest bezpiecznym magazynem rzeczywistych profili i nie zapewnia autoryzacji, prywatności na współdzielonym urządzeniu ani trwałego przechowywania.
- Wyczyszczenie danych przeglądarki usuwa demo. Brak synchronizacji i komunikacji między telefonami.
- Zdjęcia są kompresowane i mogą przekroczyć limit pamięci przeglądarki; interfejs wyświetli błąd. Nie ma eksportu danych.
- Publiczna aplikacja wymaga prawdziwego Supabase Auth, bezpiecznego Storage, RLS, zgłoszeń, blokad, moderacji, weryfikacji wieku i serwerowego usuwania kont.
- Nie przenosić lokalnego demo do produkcji bez przebudowy architektury i przeglądu prywatności.
