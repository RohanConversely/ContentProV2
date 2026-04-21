Note: the modifications mentioned in this file were discarded. This file is saved only to keep a track of what changes were made for the theme. 

# ContentPro Theme Guide

We have migrated to a **Token-First, Minimal SaaS Light Theme** as the default. 
To preserve visual consistency, all future UI work must strictly rely on our semantic variables rather than hardcoded Tailwind colors.

## 1. Global Tokens

The following explicit roles are mapped in `tailwind.config.ts` and `src/index.css`:

- **Backgrounds**:
  - `bg-background` (or `bg-bg`): Root application background (`white`).
  - `bg-surface`: Primary card/container background (`gray-50` equivalent).
  - `bg-surface-2`: Secondary background (`gray-100` equivalent), use for alternating list items or deeply nested cards.
  - *Note*: Shadcn's `bg-card` and `bg-popover` automatically map to `bg-surface`.

- **Text**:
  - `text-foreground` (or `text-text-primary`): Primary legible text.
  - `text-muted-foreground` (or `text-text-muted`): Secondary/helper text.
  
- **Accents & States**:
  - `text-[primary|accent]`, `bg-[primary|accent]`: Our core brand blue. 
  - `success`: Operations that succeeded.
  - `warning`: Operations requiring attention or currently processing.
  - `danger`: Destructive operations or failed states.

- **Borders & Shadows**:
  - `border-border`: General structural borders. NEVER use `border-gray-*` directly.
  - `shadow-glow`: Used on interactive active card elements to present a soft primary-tinted glow.
  - `shadow-card`: General subtle component drop shadow.

## 2. Interactive States

Do not explicitly write different colors on hover (`hover:bg-gray-100`) if semantic equivalence exists.
Use:
- `hover:bg-secondary` for a subtle darkening shift.
- `hover:bg-surface-2` for list item interactions.
- `hover:border-primary/40` for input fields or selectable cards.

## 3. Dark Theme Compatibility

The dark theme variables have been moved under the `.dark` class rule in `index.css`.
When adding a dark theme toggle or supporting system preferences, the class just needs to be applied to the `<html>` or `<body>` element. Ensure all new components rely purely on tokens *without* inline `.dark:...` tailwind overrides unless completely unavoidable.

## 4. Avoiding Hardcoded Colors

Before adding `text-slate-500` or `bg-zinc-900`, first look for an existing token. 

*Incorrect:* 
```tsx
<span className="text-green-500 bg-green-500/10">Completed</span>
```

*Correct:* 
```tsx
<span className="text-success bg-success/10">Completed</span>
```
