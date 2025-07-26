# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memos-bber is a Chrome browser extension that enables users to publish content to [Memos](https://usememos.com/) directly from their browser. It's based on a modification of iSpeak-bber, originally by DreamyTZK.

## Architecture

### Core Components

- **manifest.json**: Chrome Extension Manifest V3 configuration
- **popup.html**: Main extension popup UI with textarea for memo input
- **js/background.js**: Service worker handling context menus and storage
- **js/popup.js**: Main popup functionality and tab integration
- **js/oper.js**: Core operations for Memos API interactions
- **css/main.css**: Styling for the extension UI

### Key Features

- Right-click context menus for sending selected text, links, and images to Memos
- Auto-insertion of current page title and URL as markdown links
- Tag management and visibility controls (Private/Protected/Public)
- Image upload functionality with file renaming
- Random memo retrieval
- Search functionality
- Keyboard shortcuts: Ctrl+Shift+F (open extension), Alt+2 (copy markdown link)
- Multi-language support (English, Chinese)

### Storage & Configuration

Extension uses Chrome's `chrome.storage.sync` API to store:
- Memos API URL and access tokens
- User preferences and settings
- Temporary content from context menus

### API Integration

The extension integrates with Memos API v1, with backward compatibility for older API versions. Main API endpoints are handled through the oper.js file for:
- Creating new memos
- Uploading attachments
- Retrieving memo statistics
- Tag management

### File Structure

- `_locales/`: Internationalization files (en, zh_CN)
- `assets/`: Extension icons and logos  
- `clipboard/`: Offscreen document for clipboard operations
- `js/`: All JavaScript functionality including third-party libraries (jQuery, dayjs)

## Development Notes

- This is a Manifest V3 Chrome extension
- No build process - direct JavaScript files are used
- Uses jQuery for DOM manipulation
- dayjs for date/time operations
- No package.json or npm scripts - direct file editing
- Testing requires loading the extension in Chrome's developer mode

## Browser Extension Permissions

The extension requires extensive permissions including:
- tabs, storage, activeTab, contextMenus
- clipboardRead, clipboardWrite, offscreen, scripting
- Host permissions for all HTTP/HTTPS sites

## Security Considerations

Users configure their own Memos server URL and access tokens through the extension's settings interface.