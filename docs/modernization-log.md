# OpenList Frontend Modernization Log

## Phase 1 — Core Design Tokens, Workspace Sheet, Decoupled Notices & Promotions, and Structured Folder Facts

### Key Decisions & Rationale

1. **Zero-Runtime Warm Neutral CSS Tokens & Single Derived Accent (`src/styles/modern-tokens.css`, `src/utils/theme_sync.ts`)**
   - **Decision**: Establish a CSS Custom Property design system rooted in a single site-owner seed (`getMainColor()` -> `--site-main` -> `--ol-accent` and `color-mix(in oklab, ...)` derivatives) paired with warm neutral canvas/sheet surfaces (`#f4f4f2` / `#ffffff` in light mode, `#131315` / `#1c1c1f` in dark mode).
   - **Rationale**: Resource-index sites derive personality from the site owner's wallpaper, `main_color`, logo, and authored Markdown—not decorative SaaS gradients, pill badges, or colored icon backgrounds. Theme switching uses `document.startViewTransition` (~200ms crossfade, automatically skipped under `prefers-reduced-motion: reduce`).

2. **Unified Tabler Iconography & Zero Emoji UI Policy (`src/components/icons-tb.tsx`, `src/utils/icon.ts`)**
   - **Decision**: Standardize UI, toolbar, context-menu, search, and file-type glyphs onto `solid-icons/tb` with `.ol-ico { stroke-width: 1.75 }`, a two-tone `FolderGlyph` tinted by `--site-main`, and folded-page `FileTile` extension badges in Grid view. Strip `home_icon` / `share_icon` emoji prefixes from breadcrumbs.
   - **Rationale**: Eliminates visual weight mismatches from mixing 14 disparate icon packs and removes emoji icons across OS/browser font engines while surfacing archive extensions (`7Z`, `RAR`, `MKV`, `FLAC`) directly on grid tiles.

3. **GPU-Composited Wallpaper & Single `.ol-sheet` Workspace Hierarchy (`src/pages/home/`)**
   - **Decision**: Render `appearance_wallpaper` (line 1 light, optional line 2 dark) on a single `position: fixed; inset: 0; z-index: -1; transform: translateZ(0)` layer and consolidate the Home workspace into a single `.ol-sheet` (`data-surface="glass|solid"`, `--ol-wallpaper-blur`) with a strict top-to-bottom sequence:
     1. `.ol-bar.header` (brand, `Ctrl+K`/`⌘K` search trigger, segmented view switcher, theme toggle, login/manage link; no notification bell).
     2. `.ol-notice` (collapsible 1-line operational banner).
     3. `.ol-crumbs.nav` (plain-text breadcrumbs + right-aligned tabular item count and total size).
     4. `.ol-facts` (1-click copy `.ol-pw` archive password pills + safe Markdown/bare-URL `source_note` links) and `.ol-dir-tip` (compact directory `header`).
     5. `.ol-adslot` (`header_banner` creatives explicitly labeled `"广告"` with `data-nosnippet` and Matomo `data-track-content` attributes).
     6. `.obj-box` file list/grid, replacing `.ol-list__head` in-place with `.ol-selbar` on selection (sticky bottom on mobile, removing the floating `<Center />` dock).
   - **Rationale**: Eliminates `background-attachment: fixed` scroll repaints and brittle `.hope-c-*` CSS overrides, maximizes above-the-fold file visibility, and preserves `.obj-box`, `.list-item`, `.grid-item`, `.nav`, `.header`, `.body`, and `.footer` class hooks.

4. **Native Checkbox Semantics on Row & Tile Containers (`ListItem.tsx`, `GridItem.tsx`, `helper.ts`)**
   - **Decision**: Render `.ol-row` and `.ol-tile` outer wrappers as `<div role="option">` with `<LinkWithPush>` scoped to the filename text, and call only `e.stopPropagation()` (never `e.preventDefault()`) on `.ol-row__check` / `.ol-tile__check` while excluding interactive controls from `@viselect/vanilla` `beforestart`.
   - **Rationale**: Calling `e.preventDefault()` on an ancestor of `<input type="checkbox">` cancels native browser checkbox toggling and `change` dispatch. Keeping `<div>` row wrappers preserves both native checkbox multi-select (`.ol-selbar`), middle/cmd-click link opening on names, rubber-band drag selection, and right-click context menus.

5. **Decoupled Notices & Promotions with Single-Modal-Per-Visit Orchestration (`src/store/notices.ts`, `src/store/promotions.ts`, `NoticeModal.tsx`, `PromoPopupModal.tsx`)**
   - **Decision**: Separate operational announcements (`/public/notices`) from commercial ad slots (`/public/promotions`) with automatic fallback to legacy `announcement` when the new endpoints 404 or are empty. Enforce at most one auto-opened modal per visit: unread modal/critical notices open first and defer `popup_ad` to the next visit without consuming the promotion's `freq_cap`. Clamp `CloseDelaySec` strictly to `0..10`s with a conic countdown ring locking `Esc` and backdrop dismissal until `0`, plus local-midnight snoozing (`"今天不再显示"`).
   - **Rationale**: Prevents double-modal collisions, keeps commercial copy out of directory SEO summaries via `data-nosnippet`, and eliminates custom `localStorage`/DOM hacks in `customize_body`.

6. **Safe Rich Markdown Sanitization & Native Footer Telemetry (`src/components/Markdown.tsx`, `src/pages/home/Footer.tsx`)**
   - **Decision**: Extend `rehype-sanitize` with a strict property/value CSS sanitizer (`border-radius`, safe gradients, layout spacing) and tracking attribute whitelist (`data-track-content`, `data-content-name`, `data-content-piece`, `data-nosnippet`), add GitHub Alerts (`[!NOTE]`..`[!CAUTION]`), rounded `.ol-md-code-block` / `.ol-md-table-wrap` (`display: flow-root`), heading slug IDs, and an in-memory LRU render cache. Implement native `site_launch_at` uptime days, `PerformanceNavigationTiming` load duration, and `footer_links` JSON in `Footer.tsx`.
   - **Rationale**: Fixes clipped/stripped rounded corners under `filter_readme_scripts=true`, eliminates re-mount height flicker during folder navigation, and removes the need for external jQuery/FontAwesome scripts in `customize_head`.

### Deviations & Additions

- Added `color-scheme: light` / `color-scheme: dark` explicitly on `[data-modern-theme]` scopes in `src/styles/modern-tokens.css` so native checkboxes in dark mode match the `#1c1c1f` card surface.
- Implemented shallow `DirInfoProvider` & `ProviderResolver` passthrough in backend `OpenList` early in Phase 1 so `GalGames` and `Alias` routes can surface structured directory metadata cleanly alongside `x_meta`.

### Phase 1 Verification Summary (`verifier-neon`)

- Backend (`OpenList`, branch `modernize/phase-1-core-fullstack`): `go build ./...` & `go test ./internal/op/... ./server -run "TestMeta|TestNotice|TestPromotion|TestHiddenPaths"` PASS.
- Frontend (`OpenList-Frontend`, branch `modernize/phase-1-core-fullstack`): `pnpm lint` (`tsc --noEmit`) & `pnpm build` PASS.
- Full-stack CDP E2E (`127.0.0.1:5244` + `:5173`): 29/29 assertions PASS, 0 console/page errors across Light/Dark × Wallpaper Glass/Solid, single-modal Notice -> Promo 4s countdown lock + midnight snooze, `/3D` inherited header tip without 18KB root Readme leakage, `/Galgames/sub` `.ol-facts` & in-place `.ol-selbar`, `/@manage/{notices,promotions}`, and `390x844` mobile layout.
- External verification screenshots (`C:\Users\SakuraPY\.gemini\antigravity\brain\49caf45b-3dd1-413d-bfec-45cbc4923c28\`):
  - `01-visit1-notice-modal.png`, `03-visit2-promo-locked.png`, `04-root-light-glass.png`, `05-root-dark-glass.png`, `06-root-dark-solid.png`, `07-root-light-solid.png`, `08-subdir-3d.png`, `09-galgames-list-selbar.png`, `10-galgames-grid-selbar.png`, `11-manage-notices.png`, `12-manage-promotions.png`, `13-mobile-root.png`, `14-mobile-galgames.png`.
