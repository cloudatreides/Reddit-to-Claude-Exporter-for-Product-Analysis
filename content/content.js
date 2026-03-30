// Reddit to Claude Exporter — Content Script

(function () {
  const THREAD_PATTERN = /\/r\/\w+\/comments\/\w+/;

  function isThreadPage() {
    return THREAD_PATTERN.test(window.location.pathname);
  }

  if (!isThreadPage()) return;

  // --- Floating Action Button ---
  const fab = document.createElement('button');
  fab.id = 'rtc-fab';
  fab.innerHTML = '+';
  document.body.appendChild(fab);

  // Toast helper
  function showToast(message, isError = false) {
    let toast = document.getElementById('rtc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'rtc-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = isError ? 'show error' : 'show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = ''; }, 2500);
  }

  // --- Check if already queued on page load ---
  async function checkIfQueued() {
    const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
    const currentUrl = getCleanUrl();
    if (threadQueue.some(t => t.url === currentUrl)) {
      fab.innerHTML = '✓';
      fab.className = 'already-added';
    }
  }
  checkIfQueued();

  // --- URL helpers ---
  function getCleanUrl() {
    // Strip query params and trailing slashes, normalize
    let url = window.location.origin + window.location.pathname;
    url = url.replace(/\/+$/, '');
    return url;
  }

  // --- Comment parser ---
  function parseComments(commentListing, maxDepth = 2, currentDepth = 0) {
    if (!commentListing || !commentListing.data || !commentListing.data.children) return [];

    const comments = [];
    const children = commentListing.data.children;

    for (const child of children) {
      if (child.kind !== 't1') continue;
      const d = child.data;

      // Skip deleted, removed, AutoModerator
      if (!d.author || d.author === '[deleted]' || d.author === 'AutoModerator') continue;
      if (d.body === '[deleted]' || d.body === '[removed]') continue;

      const comment = {
        author: d.author,
        score: d.score || 0,
        body: d.body || '',
        depth: currentDepth,
        replies: []
      };

      // Recurse into replies if within depth limit
      if (currentDepth < maxDepth - 1 && d.replies && d.replies.data) {
        comment.replies = parseComments(d.replies, maxDepth, currentDepth + 1);
      }

      comments.push(comment);
    }

    return comments;
  }

  function flattenComments(comments) {
    const flat = [];
    for (const c of comments) {
      flat.push({ author: c.author, score: c.score, body: c.body, depth: c.depth });
      if (c.replies && c.replies.length > 0) {
        flat.push(...flattenComments(c.replies));
      }
    }
    return flat;
  }

  // --- Load user settings ---
  async function getSettings() {
    const defaults = { maxComments: 30, maxDepth: 2, sortBy: 'top' };
    const { rtcSettings = defaults } = await chrome.storage.local.get('rtcSettings');
    return { ...defaults, ...rtcSettings };
  }

  // --- Fetch thread data ---
  async function fetchThread(retries = 1) {
    const userSettings = await getSettings();
    const sortParam = userSettings.sortBy !== 'top' ? `?sort=${userSettings.sortBy}` : '';
    const jsonUrl = getCleanUrl() + '.json' + sortParam;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(jsonUrl, {
          headers: { 'User-Agent': 'RedditToClaudeExporter/1.0' }
        });

        if (res.status === 429) {
          showToast('Reddit rate limited. Wait a few seconds and try again.', true);
          return null;
        }

        if (!res.ok) {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          showToast(`Fetch failed: ${res.status}`, true);
          return null;
        }

        const json = await res.json();
        const postData = json[0].data.children[0].data;
        const commentListing = json[1];

        // Parse and sort comments using settings
        let comments = parseComments(commentListing, userSettings.maxDepth);
        // Sort top-level by score descending
        comments.sort((a, b) => b.score - a.score);
        // Keep top N top-level
        comments = comments.slice(0, userSettings.maxComments);
        // Sort each comment's replies by score too
        for (const c of comments) {
          if (c.replies) c.replies.sort((a, b) => b.score - a.score);
        }

        const flatComments = flattenComments(comments);

        const createdDate = new Date(postData.created_utc * 1000);
        const dateStr = createdDate.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        });

        return {
          subreddit: postData.subreddit,
          title: postData.title,
          author: postData.author,
          score: postData.score,
          date: dateStr,
          selftext: postData.selftext || '',
          url: getCleanUrl(),
          comments: flatComments,
          commentCount: flatComments.length,
          capturedAt: Date.now()
        };
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        showToast('Network error. Check your connection.', true);
        return null;
      }
    }
    return null;
  }

  // --- Click handler ---
  fab.addEventListener('click', async () => {
    if (fab.classList.contains('already-added') || fab.classList.contains('loading')) return;

    // Show loading
    fab.classList.add('loading');
    fab.innerHTML = '<div class="spinner"></div>';

    const thread = await fetchThread();

    if (!thread) {
      fab.classList.remove('loading');
      fab.classList.add('error');
      fab.innerHTML = '!';
      setTimeout(() => {
        fab.classList.remove('error');
        fab.innerHTML = '+';
      }, 2000);
      return;
    }

    // Check for duplicates
    const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
    if (threadQueue.some(t => t.url === thread.url)) {
      fab.classList.remove('loading');
      fab.innerHTML = '✓';
      fab.classList.add('already-added');
      showToast('Already in queue');
      return;
    }

    // Add to queue
    threadQueue.push(thread);
    await chrome.storage.local.set({ threadQueue });

    // Update badge
    chrome.runtime.sendMessage({ type: 'updateBadge', count: threadQueue.length });

    // Success state
    fab.classList.remove('loading');
    fab.classList.add('success');
    fab.innerHTML = '✓';
    showToast(`Added! (${threadQueue.length} in queue)`);

    setTimeout(() => {
      fab.classList.remove('success');
      fab.classList.add('already-added');
    }, 1500);
  });
})();
