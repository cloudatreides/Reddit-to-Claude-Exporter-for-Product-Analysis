# Reddit to Claude Exporter
Chrome extension that collects Reddit threads and exports them as Claude-optimized markdown for AI-powered product discovery and market research.

## Status
V1 / Live (local) — pending Chrome Web Store review

## Stack
- Chrome Extension (Manifest V3)
- Vanilla JS, no framework
- Chrome Storage API for queue persistence
- Reddit JSON API for thread/comment fetching

## Core Loop
Browse Reddit → click + on threads → export queue as markdown → analyze with Claude via `/reddit-analyze` skill

## Key Files
- `manifest.json` — extension config, permissions, content script registration
- `popup/popup.js` — queue UI, settings, markdown export, bulk collection logic
- `popup/popup.html` — popup layout
- `popup/popup.css` — dark mode styling
- `content/content.js` — floating + button, thread JSON fetch, comment parsing
- `content/content.css` — FAB and toast styles
- `background/background.js` — badge count updates

## Features
- One-click thread capture (post + top comments via Reddit JSON API)
- Queue management with reorder/remove
- Export to .md file or copy to clipboard
- Settings: max comments, depth, sort order, auto-prepend analysis prompt
- Bulk URL paste (multi-URL import)
- Subreddit collector with multi-keyword search (comma-separated)
- Duplicate detection on page load
- Rate limit handling with retry logic

## Companion Skill
`~/.claude/skills/reddit-analyze/` — Claude Code skill that reads exported .md files and extracts pain points, unmet needs, WTP signals, and build opportunities.

## Chrome Web Store
- Store listing draft prepared (description in conversation history)
- Assets in Downloads: `reddit-claude-icon.png`, `reddit-claude-ss1-queue.png`, `reddit-claude-ss2-capture.png`, `reddit-claude-ss3-bulk.png`
- Pending: privacy policy URL, final submission

## Open Issues
- Icon PNGs in `/icons/` are basic placeholders (Python-generated) — replace with exported Pencil icon
- No old.reddit.com testing done yet
- No handling for Reddit login-walled content
- Subreddit collector doesn't support sorting (top/hot/new) — always uses hot or relevance
