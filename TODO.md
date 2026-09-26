# TODO

## Spotkania

- [ ] Dodać na ekranie szczegółów spotkania przycisk **„Dołącz do czatu”** i otwieranie konwersacji powiązanej z `meetup_id`.
  - Backend jest już gotowy: RSVP `going` automatycznie tworzy/wiąże konwersację i dodaje uczestniczkę do `conversation_members`.
  - Po wycofaniu udziału użytkowniczka jest usuwana z czatu.
  - UI ma korzystać z istniejącej konwersacji spotkania, bez tworzenia duplikatów.
