# Polka — implementation context

## Product direction
Polka is a women-focused local social app. UI should feel native, clean, warm and Gen-Z; avoid AI-sounding copy, oversized empty cards and demo/fallback experiences leaking into production.

## Non-negotiable engineering checks
- Before every commit, verify every newly referenced variable, function, component and style exists in scope.
- Verify imports for every newly used API/component and remove stale imports.
- Never reference a helper from another screen/component scope without defining/importing it.
- Re-read the edited region after the write and check JSX/brackets and runtime identifiers.
- Never write escaped `\\n` text into JavaScript/JSX when a real newline is intended; after editing, inspect the exact affected lines for accidental escape sequences.
- Before committing, search every newly introduced runtime identifier (for example modal state such as `postMenu`) and confirm both the value and setter/function are declared in the same component scope.
- A change is not finished just because the target UI was added: first verify the edited file parses and that no newly referenced identifier is undefined.
- Preserve production Supabase/RLS behavior; prefer small backwards-compatible changes.
- Do not silently replace real production data with demo fallback data.

## Current UX direction
- Home comment composer: the user's avatar is on the LEFT, fully OUTSIDE the 999-radius bordered comment pill. Only the `Napisz komentarz…` field is inside the border. Tapping the pill opens comments and focuses the keyboard.
- Post actions: do not show permanent `Zgłoś / Edytuj / Usuń` text actions. Use a compact top-right menu trigger that opens a modal/sheet with the applicable actions.
- Post reactions: next to Like, use a compact bordered smile-plus reaction trigger. Reaction choices can include 🌹 😂 😍 🥹 🔥; selected reactions render as compact pills/counts next to post actions and persist per post/user in Supabase.
- Comments use parent_id replies. Replies render directly underneath and indented beneath the parent. Reply inserts an @mention; tapping the comment author/avatar opens that person's profile.
- Profile/discover/feed should use real profile media when available.
- Normal group chats open the normal chat screen. Temporary/anonymous chat UI is only for chats explicitly marked temporary.
- Images should support full-screen preview and pinch/pan where that interaction is offered.
- Keep visited main tabs mounted to avoid needless refetch/remount.
- Brand: #C84F7A primary, #B94B7C plum, #D94C7D accent, #F8DCE6 light, #FFF7FA canvas.
