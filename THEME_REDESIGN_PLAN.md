# Theme Redesign Plan — Cyberpunk & Japandi Visual Overhaul

## Goal

The current theme tokens (radius, shadow, font) create mild variation between themes but all three still *feel* like the same app with different colors. This plan redesigns the Cyberpunk and Japandi themes to be dramatically distinct — each with its own shape language, texture, component surfaces, and decorative details.

**Reference images:**
- **Japandi**: Kamikoto-style dark background with light paper/canvas component surfaces, thin architectural borders, serif typography, generous whitespace
- **Cyberpunk**: Cyberpunk 2077 HUD interface — cyan/yellow neon borders, clipped polygon corners, scan line textures, monospace uppercase labels, semi-transparent dark panels

---

## Japandi Theme Redesign

### Design Philosophy
Wabi-sabi minimalism. Components should feel like **paper cards floating on a dark canvas**. High contrast between the dark background and warm off-white component surfaces. Thin single-pixel borders. No heavy shadows — depth comes from surface color difference, not drop shadows.

### Color Palette Changes

| Token | Current | New |
|---|---|---|
| `--color-bg-darkest` | `#161412` | `#121110` (deeper charcoal) |
| `--color-bg-dark` | `#1e1b18` | `#1a1816` |
| `--color-bg-medium` | `#272320` | `#f5f0e8` (warm off-white — **paper surface**) |
| `--color-bg-light` | `#322e28` | `#ede7db` (slightly darker paper for hover) |
| `--color-bg-lighter` | `#3e3832` | `#e5ddd0` (pressed/active paper) |
| `--color-text-primary` | `#e8e0d6` | `#2a2420` (dark ink on paper surfaces) |
| `--color-text-secondary` | `#b0a698` | `#6b6058` (muted ink) |
| `--color-text-muted` | `#706860` | `#9a8e82` (faded ink) |
| `--color-border-subtle` | `#2a2622` | `#d4ccc0` (thin paper edge) |
| `--color-border-default` | `#3a3530` | `#c4bab0` (visible border) |
| `--color-accent` | `#7a9a6e` | `#7a9a6e` (keep — moss green) |

**Key insight**: `bg-medium` becomes the **paper surface color** (off-white) instead of a dark shade. This is the biggest visual shift — sidebars, modals, cards all render as warm paper on dark canvas. Text colors on paper surfaces flip to dark ink tones.

### New CSS Tokens Needed

```css
[data-theme="japandi"] {
  /* Paper surface for components that sit "on top" */
  --color-surface: #f5f0e8;
  --color-surface-hover: #ede7db;
  --color-surface-text: #2a2420;
  --color-surface-text-secondary: #6b6058;

  /* Thin architectural borders */
  --border-weight: 1px;
  --border-style: solid;

  /* Override shadows to near-zero */
  --shadow-card: none;
  --shadow-popup: 0 1px 4px rgba(0, 0, 0, 0.08);
}
```

### Typography
- **Heading font**: `'Noto Serif'` (keep — but increase weight to 600 for ink-stamp feel)
- **Body**: `'Inter'` (keep)
- **Heading tracking**: `0.02em` (keep)
- Add new token `--heading-weight: 600` for Japandi (vs 700 default)

### Shape
- **Radius**: Keep current soft values (12px/16px) — the round softness contrasts nicely with the flat paper surfaces
- **Borders**: Thin 1px solid borders on all card/panel edges, replacing shadow-based depth
- Consider adding a subtle CSS `background-image` noise texture to paper surfaces (tiny repeating grain pattern via data URI or SVG)

### Component-Level Changes

#### ServerSidebar (left rail)
- Background stays dark (`bg-darkest`)
- Server icons: round with thin 1px border ring instead of background color fill
- Active server: accent color thin border ring, not filled background

#### ChannelSidebar
- Background becomes paper surface color (`bg-medium` = off-white)
- All text flips to dark ink colors
- Server name header: Noto Serif, thin bottom border separator (not heavy bg change)
- Channel items: dark text, subtle hover with `bg-light` (slightly darker paper)
- Member list: dark text, status dots remain colored

#### Modal
- Paper white surface with thin 1px border
- Title: Noto Serif, dark ink
- Minimal shadow (almost flat)

#### MessageInput
- Paper surface textarea container with thin border
- Dark text input on off-white
- Send button: subtle, not filled — just accent color icon

#### MessageArea
- Background stays dark (reading area = dark canvas)
- Message text: light colors (current behavior — messages read on dark bg)
- This creates the **paper-on-canvas duality**: sidebars/modals/inputs are paper, main content is dark canvas

#### Auth Forms (Login/Register)
- Paper card with thin border on dark background
- Dark ink heading text
- Inputs with thin bottom-border-only style (underline inputs, not boxed)

### Files to Modify
1. `index.css` — Japandi color overrides, new surface tokens, border tokens
2. `ChannelSidebar.tsx` — conditional text color classes for paper surface
3. `Modal.tsx` — add border class
4. `MessageInput.tsx` — paper surface styling
5. `LoginForm.tsx` / `RegisterForm.tsx` — paper card + underline inputs
6. `SettingsModal.tsx` — paper surface sections
7. `ServerIcon.tsx` — border ring variant
8. `Button.tsx` — Japandi variant: outlined/ghost-like on paper
9. `Input.tsx` — Japandi: bottom-border-only style
10. `ThemeSettings.tsx` — update Japandi mockup preview

### Complexity Consideration
The **inverted text color** (dark-on-light for panels, light-on-dark for main content area) is the hardest part. Options:
- **A) CSS-only**: Use `color-scheme` or additional surface text tokens. Components on `bg-medium` auto-use `--color-surface-text`. Requires careful token architecture.
- **B) Component-level**: Each component checks theme and swaps text classes. More explicit but verbose.
- **Recommended: Option A** — add `--color-surface-text` and `--color-surface-text-secondary` tokens. Apply them on components that use `bg-medium` background. For default/cyberpunk themes, these equal the existing text colors.

---

## Cyberpunk Theme Redesign

### Design Philosophy
**HUD terminal interface**. Every panel looks like a holographic display. Borders are the primary visual element — not fills, not shadows. Cyan (`#00f7ff`) primary border/accent, yellow (`#fcee09`) for active/warning states, magenta (`#ff2a6d`) for danger. Corner-cut shapes via `clip-path`. Scan line texture overlay. ALL-CAPS monospace labels. Semi-transparent dark panel backgrounds.

### Color Palette Changes

| Token | Current | New |
|---|---|---|
| `--color-bg-darkest` | `#0a0a12` | `#05050d` (near-black) |
| `--color-bg-dark` | `#0f0f1e` | `#0a0a18` |
| `--color-bg-medium` | `#161628` | `rgba(10, 20, 40, 0.85)` (semi-transparent panel) |
| `--color-bg-light` | `#1e1e36` | `rgba(20, 30, 60, 0.7)` (hover panel) |
| `--color-accent` | `#ff2a6d` | `#00f7ff` (cyan — primary HUD color) |
| `--color-accent-hover` | `#ff5590` | `#33f9ff` |
| `--color-accent-muted` | `#b81e4e` | `#007a80` |
| `--color-danger` | `#ff3355` | `#ff2a6d` (magenta/red) |
| `--color-text-primary` | `#e0f0ff` | `#d0e8ff` |
| `--color-text-secondary` | `#8cb4d8` | `#00f7ff` (cyan-tinted secondary text) |
| `--color-border-subtle` | `#1a1a3a` | `rgba(0, 247, 255, 0.15)` (faint cyan border) |
| `--color-border-default` | `#2a2a50` | `rgba(0, 247, 255, 0.35)` (visible cyan border) |

### New CSS Tokens Needed

```css
[data-theme="cyberpunk"] {
  /* HUD-specific colors */
  --color-neon-cyan: #00f7ff;
  --color-neon-yellow: #fcee09;
  --color-neon-magenta: #ff2a6d;

  /* Glow effects */
  --shadow-card: 0 0 8px rgba(0, 247, 255, 0.2), inset 0 0 8px rgba(0, 247, 255, 0.05);
  --shadow-popup: 0 0 20px rgba(0, 247, 255, 0.3), inset 0 0 12px rgba(0, 247, 255, 0.08);
  --glow-accent: 0 0 10px rgba(0, 247, 255, 0.5);
  --glow-text: 0 0 8px rgba(0, 247, 255, 0.6);

  /* Corner-cut clip paths */
  --clip-panel: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  --clip-button: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  --clip-input: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);

  /* Scan line overlay */
  --scanlines: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 247, 255, 0.03) 2px,
    rgba(0, 247, 255, 0.03) 4px
  );

  /* Border glow */
  --border-glow: 1px solid rgba(0, 247, 255, 0.4);
}
```

### Typography
- **Heading font**: `'Share Tech Mono'` (keep — uppercase transform applied)
- **Body**: `'Inter'` (keep)
- **Mono**: `'Fira Code'` (keep)
- **Heading tracking**: `0.1em` (increase from 0.05em for more HUD feel)
- **Add**: `--heading-transform: uppercase` token for cyberpunk headings
- **Add**: `--heading-glow: 0 0 8px rgba(0, 247, 255, 0.6)` text-shadow for headings

### Shape
- **Radius**: 0px everywhere (completely sharp edges — clip-path handles the angular cuts)
- **Borders**: 1px cyan-tinted borders with subtle glow
- **Clip-path**: Applied to modals, buttons, cards, inputs for corner-cut polygon shapes

### Component-Level Changes

#### Global — Scan Line Overlay
Add a `::after` pseudo-element on `#root` (or body) when cyberpunk theme is active:
```css
[data-theme="cyberpunk"] #root::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: var(--scanlines);
}
```

#### ServerSidebar (left rail)
- Dark background with faint scan lines
- Server icons: sharp square (0px radius), cyan border glow on hover
- Active server: bright cyan border, subtle cyan glow behind icon
- Add server button: clip-path polygon shape, cyan border

#### ChannelSidebar
- Semi-transparent dark background with visible cyan border on right edge
- Server name: ALL-CAPS Share Tech Mono with cyan text-shadow glow
- Channel items: sharp edges, active state has left cyan accent bar
- Section headers ("CHANNELS", "ONLINE"): bright cyan, extra letter-spacing

#### Modal
- `clip-path: var(--clip-panel)` for corner-cut shape
- Cyan border with glow
- Semi-transparent dark bg with backdrop blur
- Title: ALL-CAPS, cyan glow text-shadow
- Close button: sharp square, magenta hover

#### Buttons
- Primary: `clip-path: var(--clip-button)`, cyan bg with glow
- Secondary: transparent with cyan border + clip-path
- Danger: magenta variant
- Hover: intensified glow animation

#### Inputs
- `clip-path: var(--clip-input)` (top-right corner cut only)
- Cyan bottom border that glows on focus
- Dark semi-transparent bg
- Monospace placeholder text

#### MessageInput
- Sharp edges, thin cyan border
- Typing area: dark transparent, cyan border glow on focus
- Send button: cyan icon with glow hover

#### MessageItem Action Buttons
- Sharp corners, cyan border
- Hover: cyan glow background

#### Auth Forms (Login/Register)
- Main card: clip-path panel shape with cyan border glow
- Dark semi-transparent background
- Heading: ALL-CAPS Share Tech Mono with text glow
- Corner decorations via `::before`/`::after` pseudo-elements (small bracket marks in corners)

### Files to Modify
1. `index.css` — Cyberpunk color overrides, new neon tokens, clip-paths, scanline overlay, heading glow/transform
2. `Button.tsx` — clip-path style, glow hover
3. `Input.tsx` — clip-path, cyan focus border
4. `Modal.tsx` — clip-path panel, backdrop blur, glow border
5. `Tooltip.tsx` — sharp, cyan border
6. `ServerSidebar.tsx` — sharp icons, cyan glow states
7. `ServerIcon.tsx` — 0px radius, border glow
8. `ChannelSidebar.tsx` — semi-transparent bg, all-caps headers, cyan accents
9. `ChannelItem.tsx` — left accent bar active state
10. `MessageInput.tsx` — cyan border, glow focus
11. `MessageItem.tsx` — sharp action buttons
12. `LoginForm.tsx` / `RegisterForm.tsx` — clip-path card, corner decorations
13. `AppLayout.tsx` — welcome heading glow
14. `SettingsModal.tsx` — cyberpunk heading style
15. `ThemeSettings.tsx` — update preview mockup

---

## Implementation Strategy

### Phase 1: Token Architecture (both themes)
1. Add new CSS custom properties to `index.css`:
   - `--color-surface`, `--color-surface-text`, `--color-surface-text-secondary` (for Japandi inverted panels)
   - `--clip-panel`, `--clip-button`, `--clip-input` (for Cyberpunk corner cuts, `none` for other themes)
   - `--glow-accent`, `--glow-text` (for Cyberpunk, `none` for others)
   - `--heading-transform` (`none` default, `uppercase` for Cyberpunk)
   - `--heading-glow` (`none` default, text-shadow for Cyberpunk)
   - `--scanlines` (`none` default, gradient for Cyberpunk)
   - `--border-weight` (`0` default, `1px` for Japandi)
2. Set default values in `@theme` that are no-ops (e.g., `--clip-panel: none`, `--glow-accent: none`)
3. Override in `[data-theme="cyberpunk"]` and `[data-theme="japandi"]` blocks

### Phase 2: Component Wiring
1. Update components to consume new tokens via `style` prop or Tailwind arbitrary values:
   - `clip-path: var(--clip-panel)` on Modal, auth cards
   - `clip-path: var(--clip-button)` on Button
   - `text-transform: var(--heading-transform)` on headings
   - `text-shadow: var(--heading-glow)` on headings
   - `border: var(--border-weight) solid var(--color-border-default)` on Japandi cards
2. Add scanline overlay to `index.css` (CSS-only, no component changes)
3. Wire up surface text colors for Japandi paper panels

### Phase 3: Japandi Paper Surface
1. Update `ChannelSidebar` to use surface colors for bg + text
2. Update `Modal` with thin border, paper bg
3. Update `LoginForm`/`RegisterForm` with paper card styling
4. Update `Input` for optional underline-only variant
5. Update `ServerIcon` for border-ring variant
6. Test text readability on all paper surfaces

### Phase 4: Cyberpunk HUD Details
1. Add clip-path shapes to Modal, Button, Input
2. Add corner bracket decorations (::before/::after) to auth cards
3. Add glow hover animations
4. Add left accent bar to active ChannelItem
5. Test scanline overlay doesn't interfere with interactions (pointer-events: none)
6. Test clip-path shapes don't clip content at small sizes

### Phase 5: ThemeSettings Preview Update
1. Redesign Japandi preview: show paper card on dark bg, serif heading, thin border
2. Redesign Cyberpunk preview: show HUD panel with corner cuts, cyan border glow, scan lines
3. Update descriptions

### Phase 6: Polish & Test
1. Docker build + test all three themes
2. Verify font loading
3. Verify scrollbar differences
4. Check all modals (Create Server, Invite, Create Channel, Settings)
5. Check auth flow (Login → Register → main app) in all themes
6. Test voice channel UI in all themes
7. Mobile/responsive check

---

## Risk & Complexity Notes

- **Japandi inverted colors**: The paper-surface approach means `bg-medium` goes from dark to light. Any component that assumes dark text colors will break. Need to audit every use of `bg-medium` and `text-text-primary` to ensure they work on both dark and light surfaces. The `--color-surface-text` token approach mitigates this but requires touching many components.

- **Cyberpunk clip-path**: `clip-path` clips ALL content including shadows and overflows. Tooltips/dropdowns inside clipped containers may get cut off. May need to use `filter: drop-shadow()` instead of `box-shadow` for clipped elements. Also, `clip-path` won't show `border` — borders need to be simulated with an inset `box-shadow` or a wrapper element.

- **Semi-transparent backgrounds**: Cyberpunk's `rgba()` backgrounds create layering effects where overlapping panels show through. This is desirable for the HUD effect but may cause readability issues in deeply nested UIs. Need to test the Settings modal (many nested sections).

- **Scan line overlay**: The fixed overlay covers the entire viewport. Must be `pointer-events: none` and high z-index. Test that it doesn't interfere with modals, tooltips, or dropdowns.

- **Performance**: Multiple `clip-path` elements + scan line overlay + glow `box-shadow` animations could impact rendering performance on lower-end devices. Keep glow animations simple (no continuous pulsing — only on hover/focus transitions).

---

## Estimated Scope

| Phase | Files | Effort |
|---|---|---|
| Token Architecture | 1 (index.css) | Small |
| Component Wiring | 8-10 components | Medium |
| Japandi Paper Surface | 6-8 components | Medium-Large |
| Cyberpunk HUD Details | 8-10 components | Large |
| ThemeSettings Preview | 1 component | Small |
| Polish & Test | All | Medium |

**Total**: ~15 files modified, medium-large effort across both themes.
