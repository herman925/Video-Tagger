# Video Tagger

A browser-based interval tagging tool for long-form audio or video sources. The app supports both local media files and YouTube playback, lets reviewers capture millisecond-accurate start/end points, and produces CSV/JSON exports that summarize each tagged segment.

## Features

- **Dual playback sources** – load local media or stream from YouTube while keeping a shared tagging flow.
- **Interval tagging workflow** – mark start/end points, capture language flags, tag labels, and free-form remarks per segment.
- **Timeline visualisation** – adaptive ruler, coloured interval bars, and inline context menus for overlapping tags.
- **Session management** – export CSV, save/load review sessions as JSON, and require a VID identifier before exporting.
- **Keyboard driven** – play/pause, seeking, start/end markers, and shortcut help can all be activated without leaving the keyboard.
- **Accessible UI states** – optional admin gate to toggle audio/video surfaces, light/dark theme switcher, and ARIA-friendly status updates.

## Project Structure

```
Video-Tagger/
├── css/                     # Styling layers (base, theme, timeline, tag summary, etc.)
├── js/
│   ├── core/                # Namespace bootstrap and cross-cutting utilities
│   │   ├── main.js
│   │   ├── namespace.js
│   │   ├── shortcut.js
│   │   ├── shortcut_help.js
│   │   └── utils.js
│   ├── player/              # Media playback, layout diagnostics, and timeline control
│   │   ├── audioControls.js
│   │   ├── controller.js
│   │   ├── dom.js
│   │   ├── state.js
│   │   ├── timeline.js
│   │   ├── youtubeAdapter.js
│   │   └── youtubeController.js
│   └── tagging/             # Tag capture flows, exports, and persistence
│       ├── export.js
│       ├── load.js
│       ├── save.js
│       ├── tag.js
│       └── tagsummary.js
├── index.html               # Single-page application shell
├── requirements.md          # Historical product notes
└── README.md                # You are here
```

### Module Refactor

Playback logic has been split across the `js/player/` directory:

- `dom.js` centralises DOM queries and structured logging for diagnostics.
- `audioControls.js` exposes `updateAudioControls`/`applyMediaMode` and keeps state via `player.state`.
- `timeline.js` manages the ruler markers, interval overlays, and public helpers such as `showStartDotOnTimeline`.
- `youtubeAdapter.js` surfaces the Plyr-backed adapter and shared YouTube player constants.
- `youtubeController.js` handles Plyr event wiring, player ready/state callbacks, and fallback behaviour for the YouTube API.
- `controller.js` now focuses on wiring DOM events (local loads, YouTube loads, scrubbing, shortcuts) and stays under ~500 lines.

Namespaces (`VideoTagger.core`, `VideoTagger.player`, `VideoTagger.tagging`) are initialised in `js/core/namespace.js`, keeping globals predictable while remaining bundler-free.

## Quick Start

This project is a pure static site. Any HTTP file server works for development or deployment.

```bash
# serve with Python
python -m http.server 8000

# or with Node (requires npm install -g serve)
serve .
```

Then open `http://localhost:8000` (or whichever port you choose) in a modern Chromium-based browser.

### Using the App
1. Load a local video/audio file **or** paste a YouTube URL and click **Open**.
2. Enter a VID (required before export or save).
3. Use **Mark Start** / **Mark End** buttons or the keyboard (`I` / `O`) to capture intervals.
4. Add languages, remarks, or adjust labels inline; use the timeline to navigate to any segment.
5. Export to CSV or save the session JSON when your review is complete.

Keyboard shortcuts are summarised in the in-app help modal (`?` key). The values match the list captured in `requirements.md`.

## Development Notes

- **Static assets** – No build pipeline is required. Simply edit the files in `css/` and `js/` and reload the browser.
- **Plyr & YouTube** – Plyr is bundled via CDN (`plyr.polyfilled.js`). The YouTube IFrame API script still loads on demand; ad/tracking blockers may emit warnings in the console, but playback remains functional.
- **Global namespace** – Feature scripts communicate via shared globals on `window` (e.g., `_timelineTags`, `ytPlayer`, `plyrInstance`). The new module namespace (`window.VideoTagger`) is the preferred location for reusable helpers going forward.
- **Linting/formatting** – The repo does not include tooling configuration; follow the existing code style (2-space indentation, trailing commas avoided).
- **Testing** – No automated tests exist. Manual verification against the workflow in `requirements.md` is recommended after any behavioural changes.

## Contributing Workflow

1. Fork or branch from `main`.
2. Make incremental changes (UI, tagging logic, exports, etc.).
3. Manually test local playback and a sample YouTube link; ensure tagging, summary stats, and exports still behave as expected.
4. Document noteworthy changes in commit messages or update this README when structure changes.

## Acknowledgements

- [Plyr](https://github.com/sampotts/plyr) – accessible and customisable media player skin.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) – streaming support for public videos.

---

For deeper product context, design mocks, and historical requirements, review `requirements.md`. It mirrors the workflow used by reviewers at The Education University of Hong Kong.
