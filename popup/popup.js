const queueList = document.getElementById('queueList');
const emptyState = document.getElementById('emptyState');
const threadCount = document.getElementById('threadCount');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const helpBtn = document.getElementById('helpBtn');
const instructionsPanel = document.getElementById('instructionsPanel');

// --- Settings ---
const DEFAULT_SETTINGS = {
  maxComments: 30,
  maxDepth: 2,
  sortBy: 'top',
  autoPrompt: false
};

const ANALYSIS_PROMPT = `Analyze the following Reddit threads. For each thread, extract: (1) recurring pain points with verbatim quotes, (2) existing solutions mentioned and sentiment, (3) unmet needs, (4) willingness-to-pay signals. Group findings by theme across all threads.\n\n`;

let settings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
  const { rtcSettings = DEFAULT_SETTINGS } = await chrome.storage.local.get('rtcSettings');
  settings = { ...DEFAULT_SETTINGS, ...rtcSettings };

  document.getElementById('maxComments').value = settings.maxComments;
  document.getElementById('maxDepth').value = settings.maxDepth;
  document.getElementById('sortBy').value = settings.sortBy;
  document.getElementById('autoPrompt').checked = settings.autoPrompt;
}

async function saveSettings() {
  settings.maxComments = parseInt(document.getElementById('maxComments').value) || 30;
  settings.maxDepth = parseInt(document.getElementById('maxDepth').value) || 2;
  settings.sortBy = document.getElementById('sortBy').value;
  settings.autoPrompt = document.getElementById('autoPrompt').checked;
  await chrome.storage.local.set({ rtcSettings: settings });
}

settingsBtn.addEventListener('click', () => {
  const isHidden = settingsPanel.style.display === 'none';
  settingsPanel.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) instructionsPanel.style.display = 'none';
});

helpBtn.addEventListener('click', () => {
  const isHidden = instructionsPanel.style.display === 'none';
  instructionsPanel.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) settingsPanel.style.display = 'none';
});

// Save on any setting change
settingsPanel.addEventListener('change', saveSettings);
settingsPanel.addEventListener('input', saveSettings);

loadSettings();

// --- UI ---
function updateUI(threads) {
  const count = threads.length;
  threadCount.textContent = count;
  exportBtn.disabled = count === 0;
  copyBtn.disabled = count === 0;
  clearBtn.disabled = count === 0;

  if (count === 0) {
    queueList.innerHTML = '';
    queueList.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  queueList.innerHTML = '';

  threads.forEach((thread, index) => {
    const card = document.createElement('div');
    card.className = 'thread-card';
    card.innerHTML = `
      <div class="thread-info">
        <div class="thread-subreddit">r/${thread.subreddit}</div>
        <div class="thread-title">${escapeHtml(thread.title)}</div>
        <div class="thread-meta">${thread.commentCount} comments · ↑${thread.score}</div>
      </div>
      <div class="thread-actions">
        <button data-action="up" data-index="${index}" title="Move up">↑</button>
        <button data-action="down" data-index="${index}" title="Move down">↓</button>
        <button data-action="remove" data-index="${index}" title="Remove">×</button>
      </div>
    `;
    queueList.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadQueue() {
  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  updateUI(threadQueue);
  return threadQueue;
}

loadQueue();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.threadQueue) {
    updateUI(changes.threadQueue.newValue || []);
  }
});

// Queue actions (reorder / remove)
queueList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);
  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');

  if (action === 'remove') {
    threadQueue.splice(index, 1);
  } else if (action === 'up' && index > 0) {
    [threadQueue[index - 1], threadQueue[index]] = [threadQueue[index], threadQueue[index - 1]];
  } else if (action === 'down' && index < threadQueue.length - 1) {
    [threadQueue[index], threadQueue[index + 1]] = [threadQueue[index + 1], threadQueue[index]];
  }

  await chrome.storage.local.set({ threadQueue });
  updateBadge(threadQueue.length);
});

function updateBadge(count) {
  chrome.runtime.sendMessage({ type: 'updateBadge', count });
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

// --- Markdown Generation ---
function generateMarkdown(threads) {
  const lines = [];

  if (settings.autoPrompt) {
    lines.push(ANALYSIS_PROMPT);
  }

  lines.push(`# Reddit Thread Export`);
  lines.push(`**Exported:** ${new Date().toLocaleString()} | **Threads:** ${threads.length}`);
  lines.push('');

  for (const thread of threads) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${thread.title}`);
    lines.push(`**Subreddit:** r/${thread.subreddit} | **Score:** ${thread.score} | **Date:** ${thread.date} | **Comments captured:** ${thread.commentCount}`);
    lines.push(`**URL:** ${thread.url}`);
    lines.push('');

    lines.push('### Post Body');
    if (thread.selftext && thread.selftext.trim()) {
      const body = thread.selftext.replace(/^---$/gm, '\\---');
      lines.push(body);
    } else {
      lines.push('*(link post, no body text)*');
    }
    lines.push('');

    if (thread.comments && thread.comments.length > 0) {
      lines.push('### Top Comments');
      lines.push('');

      for (const comment of thread.comments) {
        const prefix = comment.depth === 0 ? '>' : '>'.repeat(comment.depth + 1);
        const body = comment.body.replace(/\n/g, `\n${prefix} `);
        lines.push(`${prefix} **${comment.author}** (score: ${comment.score})`);
        lines.push(`${prefix} ${body}`);
        lines.push('');
      }
    }

    lines.push('');
  }

  lines.push('---');
  return lines.join('\n');
}

function downloadMarkdown(markdown) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const filename = `reddit-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', async () => {
  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  if (threadQueue.length === 0) return;
  const md = generateMarkdown(threadQueue);
  downloadMarkdown(md);
  showToast('Exported!');
});

copyBtn.addEventListener('click', async () => {
  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  if (threadQueue.length === 0) return;
  const md = generateMarkdown(threadQueue);
  await navigator.clipboard.writeText(md);
  showToast('Copied to clipboard!');
});

clearBtn.addEventListener('click', async () => {
  if (confirm('Clear all threads from queue?')) {
    await chrome.storage.local.set({ threadQueue: [] });
    updateBadge(0);
  }
});

// --- Bulk Collection ---
const bulkBtn = document.getElementById('bulkBtn');
const bulkPanel = document.getElementById('bulkPanel');
const bulkTabs = bulkPanel.querySelectorAll('.bulk-tab');
const bulkUrlsPane = document.getElementById('bulkUrls');
const bulkSubredditPane = document.getElementById('bulkSubreddit');
const bulkProgress = document.getElementById('bulkProgress');
const bulkProgressText = document.getElementById('bulkProgressText');
const bulkProgressFill = document.getElementById('bulkProgressFill');

bulkBtn.addEventListener('click', () => {
  const isHidden = bulkPanel.style.display === 'none';
  bulkPanel.style.display = isHidden ? 'block' : 'none';
});

bulkTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    bulkTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tab.dataset.tab === 'urls') {
      bulkUrlsPane.style.display = 'flex';
      bulkSubredditPane.style.display = 'none';
    } else {
      bulkUrlsPane.style.display = 'none';
      bulkSubredditPane.style.display = 'flex';
    }
  });
});

const THREAD_URL_REGEX = /\/r\/\w+\/comments\/\w+/;

function cleanRedditUrl(url) {
  try {
    const u = new URL(url.trim());
    let path = u.pathname.replace(/\/+$/, '');
    return u.origin + path;
  } catch {
    return null;
  }
}

async function fetchThreadFromUrl(url) {
  const jsonUrl = url + '.json';
  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': 'RedditToClaudeExporter/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const postData = json[0].data.children[0].data;
  const commentListing = json[1];

  // Inline comment parsing (mirrors content.js logic)
  function parseComments(listing, maxDepth, depth = 0) {
    if (!listing?.data?.children) return [];
    const out = [];
    for (const child of listing.data.children) {
      if (child.kind !== 't1') continue;
      const d = child.data;
      if (!d.author || d.author === '[deleted]' || d.author === 'AutoModerator') continue;
      if (d.body === '[deleted]' || d.body === '[removed]') continue;
      const c = { author: d.author, score: d.score || 0, body: d.body || '', depth, replies: [] };
      if (depth < maxDepth - 1 && d.replies?.data) {
        c.replies = parseComments(d.replies, maxDepth, depth + 1);
      }
      out.push(c);
    }
    return out;
  }

  function flatten(comments) {
    const flat = [];
    for (const c of comments) {
      flat.push({ author: c.author, score: c.score, body: c.body, depth: c.depth });
      if (c.replies?.length) flat.push(...flatten(c.replies));
    }
    return flat;
  }

  let comments = parseComments(commentListing, settings.maxDepth);
  comments.sort((a, b) => b.score - a.score);
  comments = comments.slice(0, settings.maxComments);
  for (const c of comments) if (c.replies) c.replies.sort((a, b) => b.score - a.score);
  const flatComments = flatten(comments);

  const createdDate = new Date(postData.created_utc * 1000);
  const dateStr = createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return {
    subreddit: postData.subreddit,
    title: postData.title,
    author: postData.author,
    score: postData.score,
    date: dateStr,
    selftext: postData.selftext || '',
    url,
    comments: flatComments,
    commentCount: flatComments.length,
    capturedAt: Date.now()
  };
}

function showProgress(current, total, failed) {
  bulkProgress.style.display = 'flex';
  const failText = failed > 0 ? ` (${failed} failed)` : '';
  bulkProgressText.textContent = `Fetching ${current}/${total}...${failText}`;
  bulkProgressFill.style.width = `${(current / total) * 100}%`;
}

function hideProgress() {
  bulkProgress.style.display = 'none';
  bulkProgressFill.style.width = '0%';
}

// Bulk URL Add
document.getElementById('bulkAddBtn').addEventListener('click', async () => {
  const input = document.getElementById('bulkUrlInput').value.trim();
  if (!input) return;

  const urls = input.split('\n').map(u => u.trim()).filter(u => u && THREAD_URL_REGEX.test(u));
  if (urls.length === 0) { showToast('No valid Reddit thread URLs found'); return; }

  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  const existingUrls = new Set(threadQueue.map(t => t.url));
  const newUrls = urls.map(cleanRedditUrl).filter(u => u && !existingUrls.has(u));

  if (newUrls.length === 0) { showToast('All threads already in queue'); return; }

  let added = 0, failed = 0;
  for (let i = 0; i < newUrls.length; i++) {
    showProgress(i + 1, newUrls.length, failed);
    try {
      const thread = await fetchThreadFromUrl(newUrls[i]);
      threadQueue.push(thread);
      added++;
    } catch {
      failed++;
    }
    if (i < newUrls.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  await chrome.storage.local.set({ threadQueue });
  updateBadge(threadQueue.length);
  hideProgress();
  showToast(`Added ${added}/${newUrls.length} threads${failed > 0 ? ` (${failed} failed)` : ''}`);
  document.getElementById('bulkUrlInput').value = '';
});

// Subreddit Collect (supports comma-separated keywords)
document.getElementById('subredditFetchBtn').addEventListener('click', async () => {
  const subreddit = document.getElementById('subredditInput').value.trim();
  if (!subreddit) { showToast('Enter a subreddit name'); return; }

  const keywordRaw = document.getElementById('keywordInput').value.trim();
  const limit = parseInt(document.getElementById('threadLimitInput').value) || 10;

  // Split keywords by comma, trim each, filter empties
  const keywords = keywordRaw
    ? keywordRaw.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  // Build list of search URLs — one per keyword, or hot if no keywords
  const searchUrls = keywords.length > 0
    ? keywords.map(kw => ({
        url: `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(kw)}&restrict_sr=1&sort=relevance&limit=${limit}`,
        label: kw
      }))
    : [{ url: `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`, label: 'hot' }];

  showProgress(0, 1, 0);

  // Collect all post URLs across all keyword searches, deduplicated
  const allPostUrls = new Set();
  let searchFails = 0;

  for (let s = 0; s < searchUrls.length; s++) {
    bulkProgressText.textContent = `Searching "${searchUrls[s].label}" (${s + 1}/${searchUrls.length})...`;
    try {
      const res = await fetch(searchUrls[s].url, { headers: { 'User-Agent': 'RedditToClaudeExporter/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      json.data.children.filter(c => c.kind === 't3').forEach(c => {
        const url = `https://www.reddit.com${c.data.permalink}`.replace(/\/+$/, '');
        allPostUrls.add(url);
      });
    } catch {
      searchFails++;
    }
    // Small delay between searches to avoid rate limits
    if (s < searchUrls.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  if (allPostUrls.size === 0) {
    hideProgress();
    showToast(`No threads found${searchFails > 0 ? ` (${searchFails} searches failed)` : ''}`);
    return;
  }

  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  const existingUrls = new Set(threadQueue.map(t => t.url));
  const newPosts = [...allPostUrls].filter(u => !existingUrls.has(u));

  if (newPosts.length === 0) {
    hideProgress();
    showToast('All threads already in queue');
    return;
  }

  let added = 0, failed = 0;
  for (let i = 0; i < newPosts.length; i++) {
    showProgress(i + 1, newPosts.length, failed);
    try {
      const thread = await fetchThreadFromUrl(newPosts[i]);
      threadQueue.push(thread);
      added++;
    } catch {
      failed++;
    }
    if (i < newPosts.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  await chrome.storage.local.set({ threadQueue });
  updateBadge(threadQueue.length);
  hideProgress();
  const kwLabel = keywords.length > 1 ? ` (${keywords.length} keywords)` : '';
  showToast(`Added ${added}/${allPostUrls.size} from r/${subreddit}${kwLabel}${failed > 0 ? ` · ${failed} failed` : ''}`);
});
