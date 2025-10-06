# Video Tagger Web App - Requirements & Workflow

## 1. Overview
A browser-based interval tagging tool for timestamp coding, tag management, and summary reporting. Supports local files and YouTube playback with optional dark/light themes. Built with HTML, CSS, JavaScript, Plyr (HTML5 player), and the YouTube IFrame API (when applicable).

---

## 2. Visual Mockup

```
+---------------------------------------------------------------+
|                        Video Tagger App                       |
+---------------------------------------------------------------+
|  Hero Screen (initial)                                         |
|  +---------------------------+--------------------------------+|
|  |  Video Tagger                                  [☀️/🌙] [?] |
|  |  [Load Local Video]  or  [YouTube URL ][Open]               |
|  |  "Please load a local video file or enter a YouTube link." |
|  +------------------------------------------------------------+|
+---------------------------------------------------------------+
|  Main Workspace (after video loads)                           |
+---------------------------------------------------------------+
|  +---------------------------+  +---------------------------+ |
|  |        Video Player       |  |        Sidebar            | |
|  |   (Plyr or YouTube embed) |  | +-----------------------+ | |
|  |   Timeline ruler w/ dots  |  | | Tag List              | | |
|  |   Timeline intervals      |  | | Start | End | Tag | 🗑 | | |
|  +---------------------------+  | +-----------------------+ | |
|  | Metadata Panel            |  | | Tag Summary (freq)    | | |
|  | VID* [___________]        |  | +-----------------------+ | |
|  | Language (optional) [▼]   |  | | Export | Save | Load  | | |
|  |                           |  | +-----------------------+ | |
|  | ⏱ Jump to Time [HH:MM:SS] |  |                               |
|  | 🏷 Tag Label [_________]   |  |                               |
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
  - Columns: Start, End, Tag label, Remarks, Actions.
  - Clicking start/end timestamps seeks the player (local Plyr or YouTube) with millisecond formatting `HH:MM:SS.mmm`.
  - Labels and per-tag remarks are inline editable; edits update chips, timeline intervals, summary, and export data instantly.
  - Delete button removes a tag and immediately refreshes markers and summary.
- **Tag entry form**
  - Tag label input captures the descriptive name for each interval (defaults to `9999` when blank).
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
  - Language is an optional dropdown covering Hong Kong core languages plus key South Asian demographics (Cantonese, English, Putonghua/Mandarin, Hindi, Urdu, Nepali, Punjabi, Tagalog, Bahasa Indonesia, Tamil, Bengali). A default "Select language" option keeps exports blank if untouched.
  - Remarks are optional per-tag notes entered alongside each interval and exported on the corresponding tag row.

---

## 5. User Workflow Example
1. Load video.
2. Enter the required VID for the session; optionally pick a Language from the dropdown (defaults to blank).
3. Watch/navigate with controls or shortcuts, pausing as needed.
4. Enter optional tag label text (default becomes `9999`) and any per-interval remark, then press `Mark Start` or `I` to begin an interval.
5. Resume playback and press `Mark End` or `O` to close the interval; list, timeline, summary, and remark column update immediately.
6. Click timeline intervals or tag rows to revisit segments; use jump input for direct positioning.
7. Edit labels or remarks inline, delete mistakes, export CSV, or save/load JSON sessions as needed.
8. Confirm VID is present before exporting (required); language selection and per-tag remarks remain optional.
---

## 6. Accessibility & Usability
- Keyboard navigation for all primary controls (buttons, timeline intervals, table rows).
- Responsive layout optimized for desktop and widescreen split view.
- Shortcut help modal accessible via `?`, duplicate `?` buttons, and `Esc` to close.

---

## 7. Technical Notes
- Local playback uses the HTML5 `<video>` element wrapped with Plyr for modern controls.
- YouTube playback uses the YouTube IFrame API and shares the same tagging/timeline flows.
- `window.showApp()` transitions UI sections once a video source is ready.
- `_timelineTags` stores interval data shared across modules (`tag.js`, `video.js`, `tagsummary.js`).
- All time navigation and tagging is millisecond-accurate across local and YouTube players.
- Modern Chromium-based browsers are primary targets; fallback to native video methods when Plyr is unavailable.
- Export CSV columns (ordered): `Video Source`, `VID`, `Language`, `Start (s)`, `End (s)`, `Start (HH:MM:SS.mmm)`, `End (HH:MM:SS.mmm)`, `Tag`, `Remarks`. Language cells remain blank if no selection; VID must be populated or export is blocked.
- Saved JSON structure to include new metadata: `{ videoSource, vid, language, tags: [{ start, end, label, remarks }] }`, with `language` optional/null and `remarks` optional per tag.

---

## 8. (Optional) Advanced Features
- Drag markers to adjust timestamp
- Filter/search tags
- Multi-user collaboration

---

This document captures the current requirements and workflow for the Video Tagger App, reflecting the hero onboarding screen, theme toggles, interval tagging flow, and shared session management.

---

This document captures the full requirements and user interaction workflow for the Video Tagger App as discussed, including all recent enhancements for ms-accurate tagging, navigation, and default tag label behavior.
