# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memos-bber is a Chrome browser extension that enables users to publish content to [Memos](https://usememos.com/) directly from their browser. It's based on a modification of iSpeak-bber, originally by DreamyTZK.

## Development Workflow

### Testing the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" and select the project root directory
4. After code changes, click the refresh icon on the extension card

### No Build Process
- This is a pure JavaScript project with no build step
- Direct file editing - changes are immediately testable after reload
- No package.json, npm, or webpack - just vanilla JS with libraries (jQuery, dayjs)

## Architecture

### Core Components & Data Flow

1. **[manifest.json](manifest.json)**: Manifest V3 configuration defining permissions, commands, and entry points
2. **[js/background.js](js/background.js)**: Service worker that:
   - Creates context menus on install
   - Handles context menu clicks (selection, link, image)
   - Manages keyboard command triggers
   - Implements link/title cleaning logic for specific websites
   - Generates Python commands for external tooling integration
   - Uses offscreen documents for clipboard access (Manifest V3 requirement)
3. **[popup.html](popup.html)**: Main UI with textarea, toolbar buttons, and settings panel
4. **[js/popup.js](js/popup.js)**: Handles popup initialization:
   - Auto-inserts cleaned current page title and URL as markdown link
   - Focuses textarea on open
5. **[js/oper.js](js/oper.js)**: Core business logic:
   - Manages chrome.storage.sync for configuration persistence
   - Handles Memos API v1 calls (with backward compatibility)
   - Implements image upload with base64 encoding and timestamped filenames
   - Manages tag-based visibility rules (PUBLIC/PRIVATE/PROTECTED)
   - Supports drag-drop and paste for image uploads
   - Integrates with Habitica API for task management

### Key Features

#### Context Menus
Right-click menus append content to the memo input:
- **Selected text**: Adds text + newline
- **Links**: Adds URL + newline
- **Images**: Adds markdown image syntax

#### Keyboard Shortcuts
- **Ctrl+Shift+F** (MacCtrl on Mac): Open extension popup
- **Alt+2**: Copy current page as markdown link `[title](url)`
- **Alt+4**: Copy clean URL (removes query params for certain sites)
- **Alt+5**: Generate Python command template for external note-taking system
- **Ctrl/Meta+Enter** (in textarea): Submit memo

#### Link & Title Cleaning
The `getCleanTitle()` and `getCleanUrl()` functions in [js/background.js](js/background.js) provide site-specific cleaning:

**URL cleaning** ([js/background.js:60-65](js/background.js#L60-L65)):
- Bilibili: Removes query parameters

**Title cleaning** ([js/background.js:68-111](js/background.js#L68-L111)):
- Twitter/X: Removes " / X" suffix and embedded links
- YouTube: Removes " - YouTube" suffix and "(N) " prefix, adds current video timestamp
- Bilibili: Removes "_哔哩哔哩_bilibili" suffix
- GitHub: Extracts repository name for repo pages
- V2EX: Removes " - V2EX" suffix
- 什么值得买: Normalizes suffix format
- Web.Cafe: Removes " | Web.Cafe" suffix
- bbs.quantclass.cn: Removes " - 量化小论坛" suffix

When adding support for new sites, update these two functions.

#### Image Upload Flow
1. User drops/pastes image or uses file picker
2. File is read as base64 via FileReader
3. Filename is timestamped: `originalname_YYYYMMDDHHmmss.ext`
4. Posted to `/api/v1/resources` with visibility setting
5. Resource metadata stored in `chrome.storage.sync.resourceIdList`

#### Tag-Based Visibility
- Users can configure special tags in settings (hidetag/showtag)
- When creating memo, if textarea contains the special tag:
  - `hidetag` → PRIVATE visibility
  - `showtag` → PUBLIC visibility
- Otherwise uses default visibility setting

#### External Integrations

**Python Command Generation** ([js/background.js:192-204](js/background.js#L192-L204)):
- Alt+5 generates a hardcoded Python command string
- Uses cleaned title/URL and passes to external note-taking script
- Command path is hardcoded in `generatePythonCommand()` function
- Update template name and paths when user environment changes

**Habitica Integration** ([popup.html:42-63](popup.html#L42-L63)):
- Settings panel accepts Habitica user ID and API key
- Stored in chrome.storage.sync
- Separate submit button in UI (`content_habitica_text`)

### Storage Schema (chrome.storage.sync)

```javascript
{
  apiUrl: '',           // Memos server URL (must end with /)
  apiTokens: '',        // Memos access token
  hidetag: '',          // Tag that triggers PRIVATE visibility
  showtag: '',          // Tag that triggers PUBLIC visibility
  memo_lock: '',        // Default visibility: PUBLIC/PRIVATE/PROTECTED
  open_action: '',      // Internal state: 'save_text'|'upload_image'
  open_content: '',     // Temporary content from context menus
  userid: '',           // (appears unused)
  resourceIdList: [],   // Array of uploaded resource metadata
  habitica_user_id: '', // Habitica integration
  habitica_api_key: ''  // Habitica integration
}
```

### File Structure

- `_locales/`: i18n files (en, zh_CN) - use `chrome.i18n.getMessage(key)`
- `assets/`: Extension icons (logo.png, logo_24x24.png)
- `clipboard/`: Offscreen document for clipboard API (Manifest V3 workaround)
- `js/`: All JavaScript
  - Third-party: jquery.min.js, dayjs.min.js, zh-cn.js, relativeTime.js
  - Core: background.js, popup.js, oper.js
  - UI utilities: message.js, view-image.js, i18n.js
- `css/main.css`: All styling

## API Integration

### Memos API v1
Primary endpoints used:
- `POST /api/v1/memos` - Create memo
- `POST /api/v1/resources` - Upload attachment
- `GET /api/v1/memos` - Fetch memos (for search/random)
- `GET /api/v1/memos/stats` - Get total memo count

Authentication: Bearer token in `Authorization` header

### Version Compatibility
Extension targets Memos v0.22.3+ but maintains compatibility with older versions through conditional logic in [js/oper.js](js/oper.js).

## Browser Permissions

Required permissions:
- `tabs`, `activeTab`: Read current page title/URL
- `storage`: Persist configuration
- `contextMenus`: Right-click functionality
- `clipboardRead`, `clipboardWrite`: Copy markdown links
- `offscreen`: Clipboard workaround for service workers
- `scripting`: Inject scripts for YouTube timestamp extraction
- Host permissions (`http://*/*`, `https://*/*`): API calls and image uploads

## Security Notes

- Users configure their own Memos server URL and access tokens
- No credentials stored in code
- Tokens stored in chrome.storage.sync (synced across user's Chrome instances)
- Python command path is hardcoded and should be reviewed before distribution
