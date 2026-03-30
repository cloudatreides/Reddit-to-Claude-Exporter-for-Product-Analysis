# Reddit to Claude Exporter

Chrome extension for collecting Reddit threads and exporting them as structured markdown — optimized for AI-powered product discovery and analysis.

## What It Does

1. Browse Reddit and click the **+** button on any thread to capture it
2. Use **Bulk+** to search a subreddit by keywords and collect multiple threads at once
3. **Export** as a `.md` file or **Copy** to clipboard
4. Upload to Claude, ChatGPT, or any LLM and ask it to extract pain points, unmet needs, competitor sentiment, and build opportunities

The exported markdown is structured specifically for LLM analysis — not just raw text dumps. Each thread includes post body, top comments with scores, metadata, and threading context.

## Install

### From Chrome Web Store
*(Coming soon)*

### Manual Install
1. Download or clone this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the repo folder

## Features

- **One-click capture** — floating + button on every Reddit thread
- **Queue management** — reorder, remove, review before export
- **Bulk collection** — paste multiple URLs or search a subreddit by keywords
- **Multi-keyword search** — comma-separated keywords to scan a subreddit broadly
- **Smart export** — structured markdown with post body, top comments, scores, and metadata
- **Settings** — configure max comments, depth, sort order
- **Auto-prompt** — optionally prepend an analysis prompt to exports
- **Duplicate detection** — won't add the same thread twice

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Max comments | 30 | Number of top comments to capture per thread |
| Max depth | 2 levels | How deep into reply chains to go |
| Sort by | Top | Comment sort order (top, new, controversial) |
| Auto-prompt | Off | Prepend analysis instructions to exports |

---

## Reddit Analyze Skill

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), you can install the `/reddit-analyze` skill to auto-analyze exports directly in your terminal.

### What It Does

Reads your exported `.md` file and extracts:
- Recurring pain points with verbatim quotes
- Existing solutions and sentiment toward them
- Unmet needs (explicit asks + implicit workarounds)
- Willingness-to-pay signals
- Build opportunities scored on severity, solo buildability, and AI-native angle

### Install the Skill

1. Create the skill directory:
   ```bash
   mkdir -p ~/.claude/skills/reddit-analyze
   ```

2. Create `~/.claude/skills/reddit-analyze/skill.md` with the contents from [`skill.md`](skill.md) in this repo.

3. Run `/reddit-analyze` in Claude Code after exporting threads. It auto-finds the latest export in your Downloads folder.

### Example Output

The skill generates a structured analysis with:
- **Signal dashboard** — distinct signals, strong signals, build opportunities, competitors found
- **Pain points** — ranked by severity with verbatim quotes
- **Opportunities** — scored on problem severity, AI-native angle, solo buildability
- **Signal log** — raw quote reference table for every substantive comment

---

## Privacy

- All data is stored locally in your browser via Chrome Storage API
- No data is sent to any external server
- No analytics, tracking, or telemetry
- The extension only accesses Reddit pages to fetch thread data via Reddit's public JSON API

## License

MIT
