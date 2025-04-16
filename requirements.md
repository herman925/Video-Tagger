# Video Tagger Web App - Requirements & Workflow

## 1. Overview
A browser-based video tagging tool for timestamp coding, tag management, and summary reporting. Built with Python (eel), HTML, CSS, and JavaScript.

---

## 2. Visual Mockup

```
+---------------------------------------------------------------+
|                        Video Tagger App                       |
+---------------------------------------------------------------+
|  +---------------------------+  +-------------------------+  |
|  |    [Video Section]        |  |    Tag Section          |  |
|  |   +-------------------+   |  |-------------------------|  |
|  |   |                   |   |  | Tag: [__________]       |  |
|  |   |                   |   |  | [Add Tag at Current]    |  |
|  |   |                   |   |  |                         |  |
|  |   +-------------------+   |  |-------------------------|  |
|  |   [Play][Pause][Seek]     |  | Tag List (clickable)    |  |
|  |   00:03:21 / 00:12:45     |  |-------------------------|  |
|  |                           |  | Time     | Tag          |  |
|  | +---------------------+   |  |----------|--------------|  |
|  | | Timeline w/Markers  |   |  | 00:01:12 | "Intro"      |  |
|  | +---------------------+   |  | 00:03:21 | "KS"         |  |
|  |                           |  | ...      | ...          |  |
|  +---------------------------+  |-------------------------|  |
|                                 | Tag Summary Table        |  |
|                                 |-------------------------|  |
|                                 | Tag      | Frequency    |  |
|                                 |----------|-------------|  |
|                                 | "Intro"  |    2        |  |
|                                 | "KS"     |    4        |  |
|                                 | ...      |   ...       |  |
|                                 |-------------------------|  |
|                                 | [Export] [Save] [Load]  |  |
|                                 +--------------
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
| T                      | Add current time to tag list             |

---

## 4. Tag Management Mechanics

- Tag List:
  - Click row: jump to timestamp (now ms-accurate)
  - Edit: inline or popup edit, updates marker and summary
  - Delete: removes tag and marker, updates summary
  - Tag time is displayed as HH:MM:SS.mmm (milliseconds)
- Timeline:
  - Markers are clickable/hoverable and ms-accurate
  - Markers jump to the exact ms on click
  - Markers update live with tag changes
- Timeline Navigation:
  - Scrubber and jump-to-time input support ms-precision (e.g., 00:01:23.456)
- Tag Input:
  - If tag input is empty, tag label is set to '9999' automatically
- Tag Summary:
  - Always visible, updates live
- Export/Save/Load:
  - Export tags/summary
  - Save/load project sessions

---

## 5. User Workflow Example
1. Load video
2. Watch/navigate, pause where needed
3. Enter tag, click 'Add' or press 'T'
4. Markers and tag list update
5. Click tag list or marker to jump (ms-accurate)
6. Edit/delete tags as needed
7. Export/save/load as needed

---

## 6. Accessibility & Usability
- Keyboard navigation for all controls
- Responsive layout for desktop/wide screens
- Tooltips/help for keyboard shortcuts

---

## 7. Technical Notes
- Video playback via HTML5 `<video>` tag (no extra player needed)
- YouTube support via embedded player (optional, more complex)
- All modern browsers supported
- All time navigation and tagging is ms-accurate and consistent

---

## 8. (Optional) Advanced Features
- Drag markers to adjust timestamp
- Filter/search tags
- Multi-user collaboration

---

This document captures the full requirements and user interaction workflow for the Video Tagger App as discussed, including all recent enhancements for ms-accurate tagging, navigation, and default tag label behavior.
