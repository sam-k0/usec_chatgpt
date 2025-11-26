/**
 * Fetch the conversation messages from the backend.
 * Returns an array of message objects: { role: 'user'|'assistant', text, ts }
 */
async function fetchMessages() {
  const res = await fetch('/api/messages');
  // If the request fails, return an empty array to avoid crashes.
  return res.ok ? res.json() : [];
}


/**
 * Render a list of messages into the messages container.
 * - Clears the container and appends each message as a bubble.
 * - Scrolls to the bottom after rendering.
 */
function renderMessages(msgs) {
  const container = document.getElementById('messages');
  container.innerHTML = '';

  msgs.forEach((m) => {
    const div = document.createElement('div');
    // Use CSS classes to control appearance for user vs assistant.
    div.className = 'msg ' + (m.role === 'user' ? 'user' : 'ai');

    // The timestamp is stored as seconds since epoch in the backend.
    const ts = m.ts ? new Date(m.ts * 1000).toLocaleTimeString() : '';

    // text is escaped to prevent injection from untrusted input.
    // If the message has a `privacy` flag, inject a small open-lock icon
    // positioned in the bottom-right corner of the bubble.
    const lockHtml = m.privacy ? `<span class="privacy-icon" title="Enthält potenziell private Informationen">` +
      `<!-- warning triangle icon -->` +
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f1b0b0" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      `<line x1="12" y1="8" x2="12" y2="13" stroke="#f1b0b0" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="12" cy="17" r="0.8" fill="#f1b0b0"/>` +
      `</svg>` +
      `</span>` : '';

    div.innerHTML = `<div class="text">${escapeHtml(m.text)}</div><span class="timestamp">${ts}</span>${lockHtml}`;
    container.appendChild(div);
  });

  // Keep the view anchored to the latest message.
  container.scrollTop = container.scrollHeight;
}


/**
 * Simple HTML-escape helper to avoid inserting raw HTML into the page.
 * Uses replaceAll which is widely supported in modern browsers.
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


/**
 * Send a user message to the backend API. Returns the assistant message JSON.
 */
async function sendMessage(text) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
  return res.json();
}


// Wire up the UI once the DOM is ready.
/**
 * Check text for potential privacy issues (emails, SSNs, etc).
 * Uses the same patterns as the backend for consistency.
 */
function detectPrivacyIssues(text) {
  if (!text) return false;

  // Check for email addresses
  const emailPattern = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  if (emailPattern.test(text)) return true;

  // Check for SSN-like patterns
  const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/;
  if (ssnPattern.test(text)) return true;

  return false;
}

window.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('composer');
  const input = document.getElementById('message-input');
  const warning = document.getElementById('privacy-warning');
  const newConvoBtn = document.getElementById('new-convo');
  const themeToggle = document.getElementById('theme-toggle');
  const sidebar = document.getElementById('sidebar');
  const resizeHandle = document.querySelector('.sidebar-resize-handle');

  // Theme toggle functionality
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
  };

  const updateThemeToggleIcon = (theme) => {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
  };

  initializeTheme();
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Sidebar resize functionality
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', () => {
    isResizing = true;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    // Get sidebar position relative to viewport
    const sidebarRect = sidebar.getBoundingClientRect();
    const newWidth = e.clientX - sidebarRect.left;
    // Constrain width between min-width and max-width
    if (newWidth >= 180 && newWidth <= 600) {
      sidebar.style.width = newWidth + 'px';
    }
  });
  document.addEventListener('mouseup', () => {
    isResizing = false;
  });

  // Set up task expand/collapse toggles
  const taskHeaders = document.querySelectorAll('.task-header');
  taskHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      const content = header.nextElementSibling;
      
      header.setAttribute('aria-expanded', !isExpanded);
      content.hidden = isExpanded;
    });
  });

  // Real-time privacy check while typing
  let checkTimer;
  input.addEventListener('input', () => {
    // Debounce the check to avoid too many updates
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      const hasPrivacyIssues = detectPrivacyIssues(input.value);
      warning.hidden = !hasPrivacyIssues;
    }, 300);

    // Auto-grow textarea height based on content
    input.style.height = 'auto';
    const newHeight = Math.min(input.scrollHeight, 300);
    input.style.height = newHeight + 'px';
  });

  // Load and render existing messages on startup.
  const msgs = await fetchMessages();
  renderMessages(msgs);

  // New conversation button: save current messages to server-side file and clear
  if (newConvoBtn) {
    newConvoBtn.addEventListener('click', async () => {
      // Ask user to confirm saving & clearing the conversation
      const confirmMsg = 'Möchten Sie den aktuellen Chat speichern und löschen? Dies kann nicht rückgängig gemacht werden.';
      if (!confirm(confirmMsg)) return;

      // Disable button while processing
      newConvoBtn.disabled = true;
      try {
        const res = await fetch('/api/save_conversation', { method: 'POST' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Could not save conversation: ' + (err.error || res.statusText));
        } else {
          const data = await res.json();
          // Refresh messages from server (should be empty after clearing)
          const updated = await fetchMessages();
          renderMessages(updated);
          // Notify user of saved file name (server returns absolute path)
          alert('Conversation saved: ' + (data.saved || 'unknown'));
        }
      } catch (e) {
        alert('Error saving conversation: ' + e);
      } finally {
        newConvoBtn.disabled = false;
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return; // ignore empty submits

    // Clear the input and hide any warnings
    input.value = '';
    warning.hidden = true;

    // Optimistic UI: render the user's message immediately while the
    // server processes the request. We append the optimistic message to the
    // current message list and then re-fetch to get the authoritative state.
    const before = await fetchMessages();
    renderMessages(before.concat([{ role: 'user', text, ts: Date.now() / 1000 }]));

    // Send to backend (placeholder echo behavior currently).
    await sendMessage(text);

    // Refresh the message list to include the assistant response.
    const updated = await fetchMessages();
    renderMessages(updated);
  });
});
