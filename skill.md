---
name: reddit-analyze
description: Analyzes exported Reddit thread markdown files for product discovery signals. Trigger when the user says "analyze reddit export", "reddit analyze", "analyze these threads", "what signals are in this", or shares/references a reddit-export .md file. Reads the export, extracts pain points, unmet needs, competitor sentiment, and build opportunities.
---

# Reddit Thread Analyzer

## Purpose
Turn raw Reddit thread exports (from the Reddit to Claude Exporter extension) into actionable product discovery signals. Extract what people actually struggle with, what solutions exist and how they feel about them, and where the gaps are that a solo builder could fill.

## User Context
- Solo AI product builder looking for build opportunities
- Cares about: problem severity, solo buildability, AI-native angles, portfolio signal
- Does NOT want: vague summaries, obvious observations, or "people want better X" without evidence
- Every insight must be grounded in verbatim quotes from the threads

---

## Step 1: Locate the Export

If the user provides a file path, read it. If not, ask:

> Which reddit export file should I analyze? (Check your Downloads folder for `reddit-export-*.md`)

If no file path given, search for the most recent export:
- Glob for `C:\Users\ASUS\Downloads\reddit-export-*.md`
- Use the most recent one

Read the full file.

---

## Step 2: Thread-Level Scan

For each thread in the export, extract:

1. **Topic**: What is this thread actually about? (one line)
2. **Emotional temperature**: Are people frustrated, curious, excited, resigned? Cite evidence.
3. **Key quotes**: 3-5 verbatim quotes that reveal real sentiment (not generic comments)

Skip threads with <5 comments or no substantive discussion (e.g., pure self-promo with only "I'm interested" replies). Flag them as low-signal.

---

## Step 3: Cross-Thread Signal Extraction

Analyze across ALL threads and extract:

### Pain Points
- What problems keep coming up?
- How severe are they? (mild annoyance vs. hair-on-fire)
- Verbatim quotes as evidence for each

### Existing Solutions & Sentiment
- What tools/products/workarounds do people mention?
- What do they like and hate about them?
- Where are the gaps in current solutions?

### Unmet Needs
- What do people explicitly ask for that doesn't exist?
- What do people work around in hacky ways? (implicit unmet need)
- What would people switch to if it existed?

### Willingness to Pay
- Any mentions of paying for solutions?
- Price anchors mentioned (even indirectly)?
- "I'd pay for X" or "I cancelled Y because..." signals

### Community Dynamics
- Who are the power users / opinion leaders in these threads?
- Are there tribal identities or strong preferences?
- What's the prevailing narrative vs. contrarian takes?

---

## Step 4: Build Opportunities

Based on the signals, surface 1-3 potential build opportunities. For each:

| Field | Detail |
|-------|--------|
| **Opportunity** | One-line description |
| **Problem severity** | Low / Medium / High — with evidence |
| **Existing alternatives** | What's out there and why it's not enough |
| **AI-native angle** | How AI makes this possible, not just faster |
| **Solo buildable?** | Yes / Maybe / No — with scope estimate |
| **First user** | Who specifically would use this on day 1? |
| **Riskiest assumption** | The one thing that must be true for this to work |
| **First experiment** | How to validate before building (NOT "build an MVP") |

If no clear opportunities exist, say so. Do not force insights from thin data.

---

## Step 5: Raw Signal Log

End with a compact reference table of every substantive quote worth revisiting:

| Thread | Author | Quote | Signal Type |
|--------|--------|-------|-------------|
| [title] | u/name | "verbatim quote" | pain / need / wtpay / sentiment |

---

## Output Rules

- Lead with the strongest signal, not a summary of what you read
- Be specific. "People are frustrated with X" is useless. "3 users in r/productivity said they spend 2+ hours daily on X and hate it" is useful.
- If the export only has 1-2 threads, flag that the sample is too small for cross-thread patterns and focus on thread-level analysis only
- Do not pad thin data. If there's nothing interesting, say "low signal — collect more threads from [suggested subreddits]"
- Mark confidence levels: strong signal (multiple independent mentions) vs. weak signal (single mention, could be one person's quirk)
