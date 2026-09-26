# Polka — implementation context

## Product direction
Polka is a women-focused local social app. UI should feel native, clean, warm and Gen-Z; avoid AI-sounding copy, oversized empty cards and demo/fallback experiences leaking into production.

## Non-negotiable engineering checks
- Before every commit, verify every newly referenced variable, function, component and style exists in scope.
- Verify imports for every newly used API/component and remove stale imports.
- Never reference a helper from another screen/component scope without defining/importing it.
- Re-read the edited region after the write and check JSX/brackets and runtime identifiers.
- Preserve production Supabase/RLS behavior; prefer small backwards-compatible changes.
- Do not silently replace real production data with demo fallback data.

## Current UX direction
- Home comment pill: compact 999-radius affordance; avatar stays fully inside its border. Tapping it opens comments and focuses the keyboard.
- Comments use parent_id replies. Replies render directly underneath and indented beneath the parent. Reply inserts an @mention; tapping the comment author/avatar opens that person's profile.
- Profile/discover/feed should use real profile media when available.
- Normal group chats open the normal chat screen. Temporary/anonymous chat UI is only for chats explicitly marked temporary.
- Images should support full-screen preview and pinch/pan where that interaction is offered.
- Keep visited main tabs mounted to avoid needless refetch/remount.
- Brand: #C84F7A primary, #B94B7C plum, #D94C7D accent, #F8DCE6 light, #FFF7FA canvas.
