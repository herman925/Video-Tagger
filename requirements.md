# Video Tagger Web App - Requirements & Workflow

## 1. Overview
A browser-based interval tagging tool for timestamp coding, tag management, and summary reporting. Supports local files and YouTube playback with optional dark/light themes. When no video stream is available, the player defaults to audio-only playback with a "No Video" placeholder. Built with HTML, CSS, JavaScript, Plyr (HTML5 player), and the YouTube IFrame API (when applicable).

---

## 2. Visual Mockup

```
+---------------------------------------------------------------+
|                        Video Tagger App                       |
+---------------------------------------------------------------+
|  Hero Screen (initial)                                         |
|  +---------------------------+--------------------------------+|
|  |  Video Tagger                      [☀️/🌙] [?] [Admin] |
|  |  [Load Local Video]  or  [YouTube URL ][Open]               |
|  |  "Please load a local video file or enter a YouTube link." |
|  +------------------------------------------------------------+|
+---------------------------------------------------------------+
|  Main Workspace (after video loads)                           |
+---------------------------------------------------------------+
|  +---------------------------+  +---------------------------+ |
|  |        Media Player       |  |        Sidebar            | |
|  |   (Plyr video / audio-only|  | +-----------------------+ | |
|  |    with "No Video" art)   |  | | Tag List              | | |
|  |   Timeline ruler w/ dots  |  | | Tag List              | | |
|  |   Timeline intervals      |  | | Start | End | Lang | Tag | Remarks | 🗑 | |
|  +---------------------------+  | +-----------------------+ | |
|  | Metadata Panel            |  | | Tag Summary (freq)    | | |
|  | VID* [___________]        |  | +-----------------------+ | |
|  |                           |  | +-----------------------+ | |
|  | ⏱ Jump to Time [HH:MM:SS] |  |                               |
|  | 🏷 Tag Label [_________]   |  |                               |
|  | 🌐 Language [☐C] [☐E] [☐M]|  |                               |
|  | 📝 Tag Remarks (optional) |  |                               |
|  |     [______________]      |  |                               |
|  | [Mark Start]  [Mark End]  |  |                               |
|  +---------------------------+  +---------------------------+ |
```

---

## 3. Keyboard Shortcuts

| Key Combination         | Action                                   |
|------------------------|------------------------------------------|
| Left Arrow             | Jump backward 5 seconds                  |
| Right Arrow            | Jump forward 5 seconds                   |
| Alt + Left Arrow       | Jump backward 1 second                   |
| Alt + Right Arrow      | Jump forward 1 second                    |
| Ctrl + Left Arrow      | Jump backward 30 seconds                 |
| Ctrl + Right Arrow     | Jump forward 30 seconds                  |
| Space Bar              | Play/Pause                               |
| I                      | Add start time to tag list               |
| O                      | Add end time to tag list                 |
| ?                      | Toggle shortcut help modal               |

---

## 4. Tag Management Mechanics

- **Interval tagging flow**
  - `Mark Start` records the precise start timestamp and shows a green dot on the timeline.
  - `Mark End` finalizes the interval, storing start, end, and label (defaults to `9999` when left blank).
  - Buttons are gated until a video is loaded (start) and start is captured (end).
- **Tag List**
  - Columns: Start, End, Language, Tag label, Remarks, Actions.
  - Clicking start/end timestamps seeks the player (local Plyr or YouTube) with millisecond formatting `HH:MM:SS.mmm`.
  - Languages, labels, and per-tag remarks are inline editable; edits update chips, timeline intervals, summary, and export data instantly.
  - Delete button removes a tag and immediately refreshes markers and summary.
- **Tag entry form**
  - Tag label input captures the descriptive name for each interval (defaults to `9999` when blank).
  - Language multi-select (Cantonese, English, Mandarin) captures one or more languages per tag; stored in colon-separated format (e.g., `Cantonese:English`).
  - Remarks input captures optional per-interval notes; stored alongside each tag and shown in the list/export.
- **Timeline**
  - Displays a ruler with adaptive tick marks and colored interval bars (minimum visual width enforced).
  - Clicking an interval seeks to its start; overlapping intervals surface a context menu to choose the target tag.
  - Active start markers highlight with a temporary dot.
- **Navigation aids**
  - Jump-to-time input accepts `HH:MM:SS.mmm`, `MM:SS.mmm`, or raw seconds and supports Plyr or YouTube seeking.
  - Keyboard shortcuts operate when focus is outside editable fields.
- **Tag Summary**
  - Always visible in the sidebar and reflects live frequency counts sorted descending.
- **Session actions**
  - Export creates a CSV including video source, start/end seconds, formatted timestamps, and tag labels.
  - Save stores session JSON (`videoSource`, `tags`); load restores both tags and timeline markers.
- **Metadata fields**
  - VID (video identifier) is required prior to export/save; UI validates presence and repeats the value for every exported row.
  - Language selection lives at the tag level via multi-select toggles (Cantonese, English, Mandarin) and exports as colon-separated values in the corresponding row; no session-level default.
  - Remarks are optional per-tag notes entered alongside each interval and exported on the corresponding tag row.
- **Admin override**
  - `Admin` button opens a modal requesting password `ks2.0`; incorrect entries keep the modal in password state.
  - Successful authentication reveals a toggle allowing the default media mode to switch between audio-only (`No Video`) and full video playback.
  - Toggle applies immediately for the current session; reverting to audio-only hides the video surface while preserving playback controls.

---

## 5. User Workflow Example
1. Load video or continue with audio-only playback (default shows "No Video" artwork until a stream is supplied).
2. If video playback is needed, click `Admin`, enter password `ks2.0`, and flip the media mode toggle to enable the video surface (optional).
3. Enter the required VID for the session.
4. Watch/listen and navigate with controls or shortcuts, pausing as needed.
5. For each interval, choose applicable language(s) (Cantonese, English, Mandarin), enter optional tag label text (default `9999`), and any per-interval remark, then press `Mark Start` or `I` to begin capturing.
6. Resume playback and press `Mark End` or `O` to close the interval; list, timeline, summary, language, and remark columns update immediately.
7. Click timeline intervals or tag rows to revisit segments; use jump input for direct positioning.
8. Edit languages, labels, or remarks inline, delete mistakes, export CSV, or save/load JSON sessions as needed.
9. Confirm VID is present before exporting (required); per-tag language selections and remarks remain optional but stored per row.
---

## 6. Accessibility & Usability
- Keyboard navigation for all primary controls (buttons, timeline intervals, table rows).
- Responsive layout optimized for desktop and widescreen split view.
- Shortcut help modal accessible via `?`, duplicate `?` buttons, and `Esc` to close.

---

## 7. Technical Notes
- Local playback uses the HTML5 `<video>` element wrapped with Plyr; when only audio is supplied (or no video track exists), Plyr presents an audio player with a "No Video" placeholder panel unless the admin toggle forces video mode.
- YouTube playback uses the YouTube IFrame API and shares the same tagging/timeline flows.
- `window.showApp()` transitions UI sections once a video source is ready.
- `_timelineTags` stores interval data shared across modules (`tag.js`, `video.js`, `tagsummary.js`).
- All time navigation and tagging is millisecond-accurate across local and YouTube players.
- Modern Chromium-based browsers are primary targets; fallback to native video methods when Plyr is unavailable.
- Export CSV columns (ordered): `Video Source`, `VID`, `Start (s)`, `End (s)`, `Start (HH:MM:SS.mmm)`, `End (HH:MM:SS.mmm)`, `Tag`, `Language`, `Remarks`. Language cells contain colon-separated selections (e.g., `Cantonese:Mandarin`) or remain blank if none; VID must be populated or export is blocked.
- Saved JSON structure to include new metadata: `{ videoSource, vid, tags: [{ start, end, label, languages, remarks }] }`, where `languages` is an array of the selected values (Cantonese, English, Mandarin) and `remarks` is optional per tag.

---

## 8. (Optional) Advanced Features
- Drag markers to adjust timestamp
- Filter/search tags
- Multi-user collaboration

---

This document captures the current requirements and workflow for the Video Tagger App, reflecting the hero onboarding screen, theme toggles, interval tagging flow, and shared session management.

---

This document captures the full requirements and user interaction workflow for the Video Tagger App as discussed, including all recent enhancements for ms-accurate tagging, navigation, and default tag label behavior.
