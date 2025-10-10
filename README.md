# Video Tagger

Browser-native interval tagging workstation for long-form speech and video analysis. Researchers can ingest YouTube streams or offline video/audio files, capture millisecond-precise segments, annotate each interval with multi-language labels and remarks, and export structured CSV or JSON records without a build step or backend.

---

## Executive Summary (Replicate-From-Doc)
- **Audience**
  - **Researchers & coders** who annotate long recordings for language studies.
  - **Facilitators** who need deterministic exports for downstream statistics.
- **Core Loop**
  - Load media (offline or YouTube) → default to **audio-only** mode to minimise cognitive load.
  - Use wired controls (`#play-pause-btn`, `#video-progress`, `#volume-slider`, `Mark Start`, `Mark End`) to scrub and capture intervals.
  - Review and edit tags in tabular form or via modals, then export/share.
- **Key Differentiators**
  - Password-protected audio/video toggle (`ADMIN_PASSWORD = 'ks2.0'`) prevents accidental mode flips during multi-hour reviews.
  - Unified controller handles both HTML5 media and the YouTube IFrame API through shared helpers (`VideoTagger.player` namespace).
  - Timeline overlays and context menu disambiguate overlapping intervals with no additional libraries.
- **Fallback Strategy**
  - If YouTube API fails to instantiate, the UI remains in audio-first mode with loading cues, and local files still operate.
  - When media sources disappear (`emptied` event) the app tears down state, clears tags, and resets controls to safe defaults.
  - All exports fall back to sentinel values (`label: '9999'`, `remarks: '9999'`) to keep downstream CSV ingestion robust.

---

## System Architecture

### Module Map
| Layer | Purpose | Key Files |
|-------|---------|-----------|
| **Shell** | Static SPA scaffolding | `index.html` |
| **Core Utilities** | Namespace bootstrap, theming, global lifecycle | `js/core/main.js`, `js/core/namespace.js`, `js/core/shortcut.js`, `js/core/shortcut_help.js` |
| **Media Subsystem** | Player orchestration, shared state, diagnostics | `js/player/state.js`, `js/player/dom.js`, `js/player/audioControls.js`, `js/player/controller.js`, `js/player/timeline.js`, `js/player/youtubeController.js`, `audioControls.js` (legacy alias) |
| **Tagging Subsystem** | Interval capture, editing, summary, persistence | `js/tagging/tag.js`, `js/tagging/tagsummary.js`, `js/tagging/export.js`, `js/tagging/save.js`, `js/tagging/load.js` |
| **Styling** | Layout, theming, timeline, modals | `css/*.css` (notably `modern.css`, `tagging.css`, `timeline.css`, `shortcut_help.css`) |

### Runtime Globals
- `window.VideoTagger`: namespaced buckets (`core`, `player`, `tagging`).
- `window.mediaMode`: `'audio'` (default) or `'video'`.
- `window.ytPlayer`: YouTube IFrame instance or `null`.
- `window.plyrInstance`: wrapper around the `<video>` element for HTML5 playback.
- `window._timelineTags`: authoritative array of interval records.
- `window.currentVID`, `window.currentVideoSource`: exported metadata.
- Dirty tracking via `window.markDirty()` / `window.markSaved()` ensures the browser warns before unload.

### Control Plane Overview
1. `index.html` declares all DOM elements (hero loader, player surface, controls, modals).
2. `js/core/main.js` is the orchestrator—on `DOMContentLoaded` it boots the module namespace, applies persisted theme, then calls `initVideo()`, `initTags()`, `initTagSummary()`, `initExport()`, `initSaveLoad()`, and keyboard helpers.
3. `js/player/controller.js` wires media inputs, hooking HTML5 `<input type="file">` and the YouTube URL button. It keeps the player UI coherent (`showPlayer()`, `primeLocalVideo()`, `setupYouTubeLoading()`), handles scrubbing/volume, and binds keyboard shortcuts to the global media API.
4. `js/player/audioControls.js` normalises the playback API, mapping either YouTube or HTML5 calls to a consistent control surface (`updateAudioControls('reason')`).
5. `js/player/timeline.js` draws the ruler ticks, lays out interval bars, renders context menus for overlaps, and shows transient dots when marking starts.
6. `js/tagging/tag.js` governs the tagging workflow, modelling modals, start/end gatekeeping, per-interval editing, and table rendering.
7. Export and save modules flatten `_timelineTags` into CSV/JSON, baking in the fallback semantics.

---

## UI & UX Blueprint

### Entry Hero (`#video-hero`)
- **Purpose**: Provide a binary choice—local upload (`#local-video-input`) vs. streaming (`#youtube-url` + `#load-youtube-btn`).
- **Transition**: `showApp()` (declared inline in `index.html`) hides the hero, flips `body.player-active`, and reveals the grid layout once metadata events (`loadedmetadata`, `youtube:ready`) fire.
- **Fallback**: If YouTube iframe never arrives, the hero remains visible and the console logs diagnostics.

### Main Grid (`#video-layout`)
- **Left Column**
  - **Player Surface**
    - HTML5 wrapper (`#html5-wrapper > video#video`) and YouTube mount (`#youtube-container`).
    - Placeholder text toggled by `applyMediaMode()` (audio vs. video cues).
  - **Playback Control Bar**
    - Play/pause button (`#play-pause-btn`) with Material icon, managed by `attachAudioToggle()`.
    - Scrubber (`#video-progress`) bound to `attachAudioProgressHandlers()` for pointer/touch scrubbing and commit semantics.
    - Time readout (`#audio-status`) fed by `formatMediaTime()`.
    - Volume slider (`#volume-slider`) writing to whichever active API is available (`setVolume()` for YouTube, property for HTML5/Plyr).
  - **Timeline Strip** (`#timeline`)
    - Drawn via `drawTimelineRuler()`; intervals appended by `updateTimelineMarkers()`.
    - Overlap interactions spawn `#timeline-context-menu`, enabling explicit tag selection.
  - **Jump-to-Time** and **Session Metadata** sections supply manual seeking and the required VID field.
  - **Tag Capture** block: `+ Add Tags` modal button, language pills, remarks textarea, `Mark Start`/`Mark End` gating.
- **Right Column**
  - **Tag List Table** (`#tag-list-table`): Start/End cells double as seek triggers; other cells open modals.
  - **Tag Summary Table** (`#tag-summary-table`): Live frequency view toggled between tags and languages (`summary-mode-btn`).
  - **Session Actions**: Export, Save, Load, and the audio/video mode toggle button.

### Modal Suite
- **Add Tags Modal** (`#add-tag-modal`): Pre-loads reusable tag labels, storing them in `pendingTagsFromModal`.
- **Manage Tags Modal** (`#tag-label-modal`): Edits interval-specific tag arrays.
- **Language Modal** (`#language-modal`): Toggles Cantonese/English/Mandarin flags via checkboxes.
- **Remarks Modal** (`#remarks-modal`): Captures rich context per interval.
- **Admin Modal** (`#admin-modal`): `prompt()` password flow is backed by this modal in markup for future enhancements.
- **Shortcut Help Modal** (wired by `initShortcutHelp()`): surfaces the key map from `requirements.md` with accessible toggles.

### Accessibility & Theme Choices
- All interactive elements have ARIA labels (`title`, `aria-label`) and keyboard affordances.
- Theme uses CSS custom properties (`css/modern.css`) and persists via `localStorage` key `theme-preference`.
- Buttons adopt large hit areas, consistent Material icons, and high-contrast states for dark/light parity.

---

## Media Subsystem Deep Dive

### Source Ingestion
- **Local Files** (`setupLocalVideoLoading()` in `js/player/controller.js`)
  1. File selection clears previous YouTube instances (`destroyYouTubePlayer()`), revokes prior object URLs, and sets the `<video>` `src`.
  2. Lifecycle listeners (`loadedmetadata`, `canplay`) call `initializePlyrOnVideo()` to hook controls and reveal the app via `showApp()`.
  3. Fallback: If load errors occur, the handler logs diagnostic info (network state, ready state) to the console.
- **YouTube Streams** (`setupYouTubeLoading()`)
  1. URL is regex-parsed for a video ID; invalid inputs raise blocking alerts.
  2. All HTML5 sources are cleared, placeholder shown, and `createYouTubePlayer(videoId)` is scheduled.
  3. `global.pendingYouTubeLoad` ensures the player is created once the API is ready (`onYouTubeIframeAPIReady`).
  4. On success, `defaultOnPlayerReady()` enables tagging controls and re-applies audio mode semantics.

### Play/Pause Wiring
- `attachAudioToggle()` listens to `#play-pause-btn` clicks and routes them to the active medium:
  - **YouTube**: uses `getPlayerState()` and `pauseVideo()/playVideo()` with state introspection to keep icon text consistent.
  - **Plyr/HTML5**: toggles `.paused` or `videoElement.paused` and updates controls.
- This function also attaches a listener array (`['play','pause','timeupdate', ...]`) on the HTML5 element to keep the UI snapshot fresh.
- Keyboard handler (`setupKeyboardShortcuts()`) captures the space bar for global toggling when focus is outside inputs.

### Scrubbing & Seeking
- `attachAudioProgressHandlers()` manages scrubbing semantics:
  - Maintains `data-scrubbing` state to prevent conflicting updates while the user holds the slider.
  - `commitSeek(val, reason)` normalises the target time, clamping it to whichever duration (`YouTube`, `Plyr`, or `video`) is authoritative, then calls `seekTo()` / `currentTime =`.
  - Supports pointer, touch, and keyboard events with discrete handlers for `pointerdown`, `touchstart`, etc.
- `setupJumpToTime()` accepts HH:MM:SS.mmm, MM:SS.mmm, or numeric seconds and dispatches to the active player.

### Volume Management
- The volume slider updates the active media via `setVolume()` (0–100 for YouTube, normalised to 0–1 for HTML5/Plyr).
- On no source, the slider is disabled and reset to 100 to avoid false state impressions.

### Timeline & Context Menu
- `drawTimelineRuler()` chooses tick intervals dynamically based on duration and container width (>60px spacing).
- `updateTimelineMarkers(tagList)` sorts tags, enforces a minimum interval width (0.5%), and renders accessible bars with `data-tag-idx` attributes.
- Click handling:
  - Direct click on a bar seeks to the start time.
  - Clicking empty timeline space calculates the approximate time, finds overlapping tags, and either seeks directly (single match) or spawns `#timeline-context-menu` with selection items.
- Start markers: `showStartDotOnTimeline(startTime)` previews the start point between the start/end click sequence; `removeStartDotFromTimeline()` cleans up after `Mark End` or cancellation.

### Media Mode Governance
- `applyMediaMode()` (in `js/player/audioControls.js`) is the master switch:
  - Updates `body.audio-mode-active` / `body.video-mode-active` to drive theming.
  - Applies `opacity: 0.001` and `pointer-events: none` to the active video container when in audio mode, ensuring playback continues without visual distraction.
  - Reveals the custom audio control bar only in audio mode; in video mode the expectation is to use inline Plyr/YouTube controls.
  - For YouTube specifically, the iframe remains in the DOM for audio mode but is visually de-emphasised, avoiding API teardown.
- Access is gated by `ADMIN_PASSWORD`. `main.js` prompts via `window.prompt()` and toggles `window.mediaMode` before re-applying the mode and refreshing the toggle button text.

### Diagnostics & Logging
- `player.logPlayerLayout(context)` (from `js/player/dom.js`) dumps a thorough console snapshot: computed styles, bounding boxes, audio control metadata, YouTube/HTML5 diagnostics, and Plyr state. Use this when debugging layout regressions.
- `updateAudioControls(trigger)` logs whenever a meaningful delta (playback state, current time, duration) occurs, helping trace stale UI states during QA.

---

## Tagging Subsystem

### Tag Data Model
```typescript
type TagRecord = {
  start: number;          // seconds, three decimal places
  end: number;            // seconds, three decimal places
  label: string | string[]; // sentinel '9999' if none
  languages: string[];    // subset of LANGUAGE_OPTIONS
  remarks: string;        // empty string allowed
};
```
- Stored in `_timelineTags`. `tag.js` always copies/sorts arrays when reading to avoid accidental mutation side-effects.
- Derived helper `languagesToInitials()` condenses array values to `C:E:M` for tabular display.

### Pre-Tag Setup
- `initTags()` disables tagging controls until media is ready.
- `pendingTagsFromModal` caches the selection from the Add Tags modal so repeated intervals can inherit the same labels without retyping.
- Language pills default to Cantonese and English active (per historical workflow) but can be toggled off; state is encoded in the button class `.active` rather than checkboxes for quick scanning.

### Start/End Workflow
1. **Mark Start** (`startTagBtn` click or `I` key)
   - Validates VID presence (`#vid-input`), blocking progress with an alert if missing.
   - Captures current playback time via `getCurrentTime()`, gating on either YouTube or HTML5 API.
   - Disables `Mark Start`, enables `Mark End`, locks remarks/language inputs, and shows `timeline-start-dot`.
2. **Mark End** (`endTagBtn` click or `O` key)
   - Captures end time and ensures it is ≥ start time.
   - Constructs the tag object, applying defaults: label(s) from `pendingTagsFromModal` or `'9999'`, languages from active pills, remarks text or empty string.
   - Pushes to `_timelineTags`, re-enables inputs, clears remarks, resets pills, removes dot, and redraws timeline + summary.
   - Calls `window.markDirty()` to trigger unload protection.
3. **Error Handling**
   - If end time < start time, the workflow aborts gracefully, re-enabling controls and alerting the user.

### Editing & Review
- Clicking cells in the tag table triggers modals that operate on `editingTagIndex` (bound to the underlying array index).
- Delete actions include a `confirm()` prompt before splicing the array and refreshing UI artefacts.
- `renderTagList()` sorts tags on each render to keep chronological order independent of insertion sequence.

### Summaries & Analytics
- `window.updateTagSummary()` (in `tagsummary.js`) recomputes counts by tag or by language. The toggle persists inside the DOM dataset so the view updates reactively after edits.
- Timeline is refreshed alongside the summary to keep visual cues aligned.

---

## Persistence & Export

### CSV Export (`initExport()`)
- Guard clauses ensure tags exist and VID is provided.
- Each row contains both numeric seconds (`Start (s)`, `End (s)`) and formatted times (`HH:MM:SS.mmm`).
- Languages are exported as binary columns (Cantonese/English/Mandarin) to simplify pivot tables.
- Remarks default to `'9999'` when empty so spreadsheets flag missing annotations explicitly.
- UTF-8 BOM is preprended to avoid Mojibake when opening in Excel.

### JSON Save / Load (`initSaveLoad()`)
- Save: Serialises the session object and forces download via blob. Marks the document as saved (`markSaved()`).
- Load: Reads a JSON file, normalises each tag (filters invalid languages, ensures numeric times), repopulates `_timelineTags`, updates UI, and alerts on success.
- Fallback: Malformed files trigger an alert with the thrown error message; no partial state is applied.

### Session Clearing
- `video-tagger:clear-session-request` (CustomEvent) resets tagging state when switching sources (local vs. YouTube) to prevent interval leakage.
- `goHomeBtn` handler in `main.js` uses `resetMediaState('home')` + `clearTaggingSession('home')` to fully revert the interface, including destroying YouTube/Plyr instances and revoking object URLs.

---

## Keyboard Shortcuts

| Key | Action | Implementation |
|-----|--------|----------------|
| `Space` | Play/Pause | `setupKeyboardShortcuts()` monitors document-level `keydown`. |
| `I` | Mark Start | Bound to `startTagBtn.click()` through event listeners in `tag.js`. |
| `O` | Mark End | Same as above for `endTagBtn`. |
| `← / →` | Seek ±5s | Implemented in `js/core/shortcut.js` (not shown) to call the active media API. |
| `Alt + ← / →` | Seek ±1s | Fine-grained adjustments. |
| `Ctrl + ← / →` | Seek ±30s | Coarse adjustments. |
| `?` | Toggle shortcut help modal | Provided by `initShortcutHelp()`. |
| `Esc` | Close any modal | Bound via data attributes in modal setup. |

Focus is intentionally suppressed when the user is editing form inputs; shortcuts only fire if `document.activeElement` is not typing (`tag.js` guards this).

---

## Theming, Styling, & Accessibility
- `css/modern.css` defines root variables for light/dark themes; dark mode is applied by toggling `data-theme="dark"` on `<html>`.
- `#theme-toggle` and header toggle rely on Material icons to indicate the next mode (sun/moon idiom).
- Buttons and pills use consistent border-radius and box-shadow to communicate affordance; the timeline uses elevated drop shadows to highlight active bars (`.timeline-interval` hover states).
- `shortcut_help.css` and `tagsummary.css` unify typography (Inter/Roboto) to match the hero screen for brand consistency.

---

## Engineering Notes & Fallback Decisions
- **No Bundler**: Everything runs as static assets. This simplifies deployment (copy to any static file server) and debugging (view-source friendly).
- **Password-Protected Mode Switch**: Chosen to avoid UI drift mid-session; the password `ks2.0` aligns with the institution’s internal code.
- **Audio-First Design**: The default mode hides video surfaces (`opacity: 0.001`). This reduces bandwidth and emphasises linguistic analysis. Video mode can be enabled when visual cues are required.
- **Sentinel Values**: `'9999'` is used for empty tags/remarks to stay compatible with legacy scripts that expect mandatory values.
- **YouTube Resilience**: `pendingYouTubeLoad` tracks deferred player creation. If the API fails, diagnostics are logged and the UI remains responsive for local files.
- **Object URL Hygiene**: Every local file load revokes the previous `URL.createObjectURL` to avoid gradually leaking memory in Chrome during marathon sessions.
- **Dirty State Handling**: `beforeunload` warns users if `_timelineTags`, metadata, or VID changed but weren’t saved.

---

## Build, Deployment, & Testing
- **Local Development**
  ```bash
  # Python static server
  python -m http.server 8000

  # Node alternative (requires `npm install -g serve`)
  serve .
  ```
  Open `http://localhost:8000` in a Chromium-based browser (Chrome, Edge). Safari is partially supported but not officially validated.
- **Production Deployment**
  - Upload the contents of the repository to any static hosting provider (e.g., Netlify, GitHub Pages, on-prem HTTP server).
  - Ensure external CDNs (Plyr JS/CSS, Google Fonts, YouTube IFrame API) are not blocked by network policies.
- **Smoke Test Checklist**
  1. Load a local MP4 → confirm hero hides, audio controls enable, timeline draws.
  2. Paste a YouTube URL → confirm iframe appears after authentication, audio mode still hides video until password toggle.
  3. Capture at least two tags with overlapping time slices → verify timeline context menu.
  4. Edit languages/remarks → re-open row to confirm persisted.
  5. Export CSV → inspect BOM and columns, ensure VID present.
  6. Save JSON, refresh page, load JSON → confirm state fully restored.
  7. Toggle video mode with password → ensure audio banner hides, video surface visible.
- **Diagnostics**
  - Use browser devtools Console to inspect `[video.js]` logs for playback issues.
  - `player.logPlayerLayout('context')` can be called manually for DOM snapshots.

---

## File Structure Reference
```
Video-Tagger/
├─ index.html                    # SPA scaffold, inline showApp logic, modal markup
├─ audioControls.js              # Legacy global shim pointing to player controls
├─ css/
│  ├─ main.css                   # Base layout & typography
│  ├─ modern.css                 # Theme tokens, timeline polish
│  ├─ tagging.css                # Control column styles
│  ├─ video.css                  # Player sizing
│  ├─ tags.css                   # Tag list table elements
│  ├─ tagsummary.css             # Summary table
│  ├─ shortcut_help.css          # Shortcut modal styling
│  └─ modals.css                 # Shared modal design
├─ js/
│  ├─ core/
│  │  ├─ main.js                # App bootstrap, theming, admin toggle, reset logic
│  │  ├─ namespace.js           # Ensures consistent namespaces on window
│  │  ├─ shortcut.js            # Keyboard navigation & seeking
│  │  ├─ shortcut_help.js       # Renders help modal content
│  │  └─ utils.js               # Misc helpers (if present)
│  ├─ player/
│  │  ├─ state.js              # Shared constants (MEDIA_MODE) and state snapshot
│  │  ├─ dom.js                # DOM query helpers & layout logging
│  │  ├─ audioControls.js      # Format time, getActiveMediaApi, applyMediaMode
│  │  ├─ controller.js         # Wire inputs, scrubbing, keyboard hooks, showPlayer
│  │  ├─ timeline.js           # Ruler drawing, interval overlay, context menus
│  │  └─ youtubeController.js  # YouTube API bootstrap & polling
│  └─ tagging/
│     ├─ tag.js               # Capture loop, modals, table rendering
│     ├─ tagsummary.js        # Summary table recalculation
│     ├─ export.js            # CSV generator with BOM
│     ├─ save.js              # JSON save/load flows
│     └─ load.js              # (Optional legacy helper if referenced)
├─ test-player.html             # Minimal playback harness for debugging
├─ requirements.md              # Historic product brief & shortcut tables
└─ README.md                    # This document (PRD + technical reference)
```

---

## Future Enhancements (Backlog Context)
- Drag-adjust interval boundaries directly on the timeline (requires pointer tracking and collision detection).
- Tag filtering/search in the right column for quick retrieval on large datasets.
- Multi-user collaboration with server-backed storage (would require replacing the static architecture).
- Additional export formats (Excel, XML) or direct integration with analytics pipelines.

---

## Credits & Dependencies
- **Plyr** (`https://cdn.plyr.io/3.7.8/`) for consistent HTML5 audio/video controls. Currently used passively; custom bar takes over in audio mode.
- **YouTube IFrame API** (`https://www.youtube.com/iframe_api`) for streaming playback with JS control.
- **Google Fonts (Roboto, Inter)** and Material Symbols for cohesive typography and icons.
- Developed for The Education University of Hong Kong’s KeySteps@JC programme.

For historical decisions, UI mockups, and design rationales, cross-reference `requirements.md`.
