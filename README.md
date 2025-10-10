# Video Tagger

A browser-based interval tagging tool for long-form audio or video sources, designed for researchers at The Education University of Hong Kong. The app supports both local media files and YouTube playback, enables reviewers to capture millisecond-accurate start/end points, and produces CSV/JSON exports that summarize each tagged segment with multiple tags, language flags, and contextual remarks.

## Design Philosophy & UX Principles

### Audio-First Approach
Video Tagger **defaults to audio mode** to minimize cognitive load and bandwidth consumption during extended review sessions. Video is hidden (opacity: 0.001) while audio continues playing, allowing reviewers to focus on linguistic analysis without visual distraction. Users can switch to video mode via a password-protected toggle when visual context is required.

### Progressive Disclosure
The interface reveals complexity gradually:
1. **Landing hero** – Simple file upload or YouTube URL input
2. **Two-column layout** – Left column for tagging controls, right column for tag management
3. **Modals** – Deep editing features (managing multiple tags per interval) appear on demand
4. **Timeline visualization** – Appears after first tag, showing temporal relationships

### Accessibility & Dark Mode
- Full keyboard navigation support (Space, I/O for mark points, arrow keys for seeking)
- Light/dark theme with proper contrast ratios
- ARIA labels on all interactive elements
- Material Symbols Outlined icons for visual clarity

## Features

- **Dual playback sources** – Load local media or stream from YouTube while keeping a unified tagging workflow
- **Multi-tag intervals** – Each interval can have multiple semicolon-separated tags
- **Language matrix** – Three-language support (Cantonese, English, Mandarin) exported as binary columns
- **Timeline visualisation** – Adaptive ruler, colored interval bars, click-to-seek functionality
- **Session management** – Export CSV with language columns (0/1), save/load JSON sessions
- **Audio/video mode toggle** – Password-protected (ks2.0) to prevent accidental switching
- **Keyboard driven** – Spacebar for play/pause, I/O for start/end markers, ? for help
- **Modal-based tag editing** – Add/remove tags dynamically, manage remarks inline

## UI Layout Architecture

### Landing Page (Hero Section)
**State:** Before any video is loaded  
**Purpose:** Streamlined entry point for loading media

**Components:**
- **Hero banner** with app title and description
- **YouTube URL input** with "Open" button
- **Local file input** (styled as upload area)
- **Collapse button** to hide hero after loading

**UX Decision:** The hero hides automatically when media loads (`showApp()` function), transitioning smoothly to the main interface.

### Main Application Layout
**State:** After video loads  
**Structure:** Two-column grid with collapsible player section

```
┌─────────────────────────────────────────────────────────────┐
│  PLAYER SECTION (collapsible)                                │
│  ┌─────────────────────────┐  ┌───────────────────────┐    │
│  │   Video Container       │  │  Audio Control Bar    │    │
│  │   (YouTube / HTML5)     │  │  (audio mode only)    │    │
│  └─────────────────────────┘  └───────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Timeline Ruler with Interval Markers                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────────────────┐
│  LEFT COLUMN         │  RIGHT COLUMN                        │
│  (Controls)          │  (Tag Management)                    │
│                      │                                      │
│  • Session Metadata  │  • Tag List Table                    │
│    - VID input       │  • Tag Summary Table                 │
│  • Add Tag Section   │  • Session Actions                   │
│    - "+ Add Tags"    │    - Export / Save / Load            │
│    - Language pills  │    - Audio/Video Mode Toggle         │
│    - Remarks textarea│                                      │
│    - Mark Start/End  │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### Layout Behavior
- **Player collapse**: Click button to hide player section, expanding workspace for tag management
- **Responsive**: Two-column layout on desktop, stacks on mobile
- **Theme-aware**: All colors use CSS custom properties (`--bg-primary`, `--text-primary`, etc.)

## Video Player Architecture

### Dual Player System
Video Tagger supports **two completely different playback engines** while maintaining a unified interface:

#### 1. YouTube Player (IFrame API)
**File:** `js/player/youtubeController.js`

**Initialization:**
1. User pastes YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
2. App extracts video ID via regex
3. YouTube IFrame API script loads dynamically
4. `YT.Player` instantiated with callbacks: `onPlayerReady`, `onPlayerStateChange`

**Key Features:**
- Asynchronous API loading (waits for `onYouTubeIFrameAPIReady`)
- State change detection (playing, paused, buffering, ended)
- Millisecond-accurate `getCurrentTime()` and `seekTo()`
- No download required - streams directly from YouTube

**Audio Mode Implementation:**
```javascript
if (mode === MEDIA_MODE.AUDIO) {
  youtubeContainer.style.opacity = '0.001';  // Hide video
  youtubeContainer.style.pointerEvents = 'none';  // Disable clicks
  // Audio continues playing
}
```

**Gotchas:**
- Must wait for `onReady` event before calling player methods
- Ad blockers may interfere with API loading
- Requires internet connection

#### 2. HTML5 Local Player (Plyr-wrapped)
**File:** `js/player/controller.js` (setupLocalVideoLoading)

**Initialization:**
1. User selects local file via `<input type="file">`
2. File object converted to blob URL: `URL.createObjectURL(file)`
3. Blob URL assigned to `<video>` element's `src` attribute
4. Plyr library wraps native video element for consistent UI
5. Event listeners attached: `loadedmetadata`, `timeupdate`, `play`, `pause`

**Key Features:**
- Works offline - no network required
- Supports MP4, WebM, OGG formats (browser-dependent)
- Native HTML5 performance
- Blob URL automatically revoked on new load to prevent memory leaks

**Audio Mode Implementation:**
```javascript
if (mode === MEDIA_MODE.AUDIO) {
  html5Video.style.opacity = '0.001';
  html5Video.style.pointerEvents = 'none';
  html5Wrapper.style.opacity = '0.001';  // Hide Plyr wrapper too
  // Audio playback continues
}
```

**Gotchas:**
- Large files may cause memory issues in browser
- Blob URLs are session-specific (don't persist across refreshes)
- Format support varies by browser

### Unified Interface Layer
**File:** `js/player/audioControls.js`

Both players feed into a **unified control system**:

**Core Functions:**
- `getActiveMediaApi()` - Returns current player (YouTube or HTML5)
- `updateAudioControls()` - Syncs UI with playback state
- `applyMediaMode()` - Switches between audio/video modes
- `formatMediaTime()` - Converts seconds to HH:MM:SS.mmm

**Shared State:**
```javascript
window.mediaMode = 'audio' | 'video'  // Default: 'audio'
window.ytPlayer = <YT.Player instance> | null
window.plyrInstance = <Plyr instance> | null
```

**Player Detection Logic:**
```javascript
function getActiveMediaApi() {
  if (window.ytPlayer && typeof window.ytPlayer.getPlayerState === 'function') {
    return { type: 'youtube', player: window.ytPlayer };
  }
  if (window.plyrInstance?.media) {
    return { type: 'html5', player: window.plyrInstance };
  }
  return { type: 'none', player: null };
}
```

### Media Mode System

**Two Modes:**
1. **Audio Mode** (default) - Video hidden, audio plays
2. **Video Mode** - Full video visible

**Switching:**
- Click "Switch to Audio/Video Mode" button
- Enter password: `ks2.0` (prevents accidental toggling during long sessions)
- Mode applies immediately via `applyMediaMode()`

**Visual State Changes:**
| Element | Audio Mode | Video Mode |
|---------|------------|------------|
| Video player | opacity: 0.001 | opacity: 1 |
| Audio control bar | visible | hidden |
| Placeholder text | "Audio playback active" | "No Video" |
| Body class | `.audio-mode-active` | `.video-mode-active` |

**Why Password-Protected?**
Reviewers work in long sessions (1-2 hours). Accidental mode changes disrupt workflow and waste bandwidth. The password (`ks2.0`) ensures intentional switching only.

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
- `youtubeController.js` now wraps the native YouTube IFrame API, wiring ready/state events directly into the tagging flow without an extra adapter layer.
- `controller.js` now focuses on wiring DOM events (local loads, YouTube loads, scrubbing, shortcuts) and stays under ~500 lines.

Namespaces (`VideoTagger.core`, `VideoTagger.player`, `VideoTagger.tagging`) are initialised in `js/core/namespace.js`, keeping globals predictable while remaining bundler-free.

## Tagging Workflow

### 1. Preparation Phase
**User Actions:**
1. Load video (YouTube or local file)
2. Enter VID in Session Metadata field (required for export)
3. Click "+ Add Tags" button to open tag configuration modal

**Add Tags Modal:**
- Click "+ Add Tag" button → Input field appears
- Type tag name and press Enter → Tag added to list
- Repeat for multiple tags (e.g., "Introduction", "Main Content", "Conclusion")
- Click "Done" → Tags populated in hidden state

### 2. Tagging Phase
**User Actions:**
1. **Select languages** in left column (Cantonese, English, Mandarin - toggle buttons)
2. **Type remarks** in textarea (optional contextual notes)
3. **Click "Mark Start"** (or press `I` key) → Video starts playing, start time captured
4. **Watch/listen** to video segment
5. **Click "Mark End"** (or press `O` key) → End time captured, interval created

**What Happens:**
```javascript
// Interval object created
{
  start: 12.456,  // seconds with millisecond precision
  end: 25.789,
  label: ["Introduction", "Welcome"],  // Array of tags
  languages: ["Cantonese", "English"],  // Selected languages
  remarks: "Speaker introduces topic"
}
```

**Visual Feedback:**
- Timeline shows colored bar for interval
- Tag list table updates with new row
- Tag summary table updates counts
- "Dirty" flag set (prompts save before closing)

### 3. Editing Phase
**Inline Editing:**
- **Click tag cell** → Opens "Manage Tags" modal
  - Add/remove tags for that specific interval
  - Tags shown as deletable chips
  - Click "Save Changes" to apply
- **Click language cell** → Opens language modal
  - Toggle language checkboxes
  - Instant update on save
- **Click remarks cell** → Opens remarks modal
  - Multi-line textarea for detailed notes
- **Click start/end time** → Seeks video to that timestamp

**Bulk Actions:**
- Click interval on timeline → Seeks to start time
- Click delete button → Removes entire interval
- Right-click interval (future feature) → Context menu

### 4. Export Phase
**CSV Export:**
Click "Export" button → Generates CSV with structure:
```csv
Video Source,VID,Start (s),End (s),Start (HH:MM:SS.mmm),End (HH:MM:SS.mmm),Tag,Cantonese,English,Mandarin,Remarks
"video.mp4","VID001",12.456,25.789,00:00:12.456,00:00:25.789,"Introduction;Welcome",1,1,0,"Speaker introduces topic"
```

**Key Features:**
- **Tags**: Semicolon-separated in single column
- **Languages**: Three binary columns (1 = selected, 0 = not selected)
- **Times**: Both seconds (for computation) and HH:MM:SS.mmm (for humans)
- **UTF-8 BOM**: Ensures Excel handles Unicode correctly

**JSON Save:**
Click "Save" button → Generates JSON with full session state:
```json
{
  "videoSource": "video.mp4",
  "vid": "VID001",
  "tags": [
    {
      "start": 12.456,
      "end": 25.789,
      "label": ["Introduction", "Welcome"],
      "languages": ["Cantonese", "English"],
      "remarks": "Speaker introduces topic"
    }
  ]
}
```

**Load Session:**
Click "Load" button → File picker → Restores entire session (video source, VID, all intervals)

## Modal System

### Modal Architecture
**File:** `css/modals.css` + inline modal HTML

**Three Modal Types:**

#### 1. Tag Label Modal ("Manage Tags")
**Trigger:** Click tag cell in tag list table  
**Purpose:** Add/remove/edit tags for a specific interval

**Components:**
- "+ Add Tag" button → Reveals input field
- Tag list with delete buttons (Material Symbols `delete` icon)
- Existing tags shown as styled chips (`.tag-list-item`)
- "Cancel" and "Save Changes" buttons

**Data Flow:**
```javascript
// On open
editingTagIndex = 5;  // Which interval we're editing
populateExistingTags(5);  // Show current tags

// User adds tag
addNewTag();  // Appends to array

// On save
window._timelineTags[5].label = ["Tag1", "Tag2", "Tag3"];
renderTagList();  // Update table
```

#### 2. Language Modal
**Trigger:** Click language cell in tag list table  
**Purpose:** Toggle language flags for interval

**Components:**
- Three checkboxes (Cantonese, English, Mandarin)
- Pre-selected based on current interval
- "Cancel" and "Save" buttons

**UX:** Checkboxes update `tag.languages` array on save

#### 3. Remarks Modal
**Trigger:** Click remarks cell (📝 or ➕ icon)  
**Purpose:** Add/edit free-form text notes

**Components:**
- Multi-line textarea (6 rows)
- "Cancel" and "Save" buttons

**UX:** Simple text update, no special formatting

### Modal Behavior
- **Backdrop click** → Closes modal (via `data-*-close` attribute)
- **Escape key** → Closes modal
- **Enter key** in inputs → Submits (where appropriate)
- **Focus trap** → First input auto-focused on open
- **Dark mode** → All modals inherit theme colors

## Data Structures

### Tag Object
```typescript
interface Tag {
  start: number;          // Seconds with millisecond precision (e.g., 12.456)
  end: number;            // Seconds with millisecond precision
  label: string | string[]; // Single tag or array of tags
  languages: string[];    // Array of language codes: ["Cantonese", "English", "Mandarin"]
  remarks: string;        // Free-form text notes
}
```

**Storage:** `window._timelineTags: Tag[]`

### Player State
```typescript
interface PlayerState {
  sourceType: 'youtube' | 'html5' | 'none';
  isPlaying: boolean;
  current: number;        // Current playback time (seconds)
  duration: number;       // Total duration (seconds)
  html5HasVideo: boolean; // Whether HTML5 video element has src
  ytPlayerAvailable: boolean;  // Whether YouTube player is ready
  ytReadyState: number | null; // YouTube player state
}
```

**Storage:** `window.VideoTagger.player.state`

### Session Data
```typescript
interface Session {
  videoSource: string;    // Filename or YouTube URL
  vid: string;            // User-provided video identifier
  tags: Tag[];            // Array of all intervals
}
```

**Export Formats:**
- **JSON**: Full fidelity, includes all metadata
- **CSV**: Flattened for Excel, languages as 0/1 columns

## Quick Start

This project is a pure static site. Any HTTP file server works for development or deployment.

```bash
# serve with Python
python -m http.server 8000

# or with Node (requires npm install -g serve)
serve .
```

Then open `http://localhost:8000` (or whichever port you choose) in a modern Chromium-based browser.

### Player Test Harness

When debugging playback issues, click the **Test** button in the bottom-right corner of the home page (admin password required) to launch `test-player.html`. The standalone page provides the simplest possible environment: a native YouTube IFrame API embed and an optional Plyr-wrapped local file loader, letting you confirm playback works before exercising the full tagging UI.

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
