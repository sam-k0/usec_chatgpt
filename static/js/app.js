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
    const lockHtml = m.privacy ? `<span class="privacy-icon" title="Potential private info exposed">` +
      `<!-- open lock icon -->` +
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M17 8V7a5 5 0 00-10 0v1" stroke="#f1b0b0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="3" y="8" width="18" height="13" rx="2" stroke="#f1b0b0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
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

  // Real-time privacy check while typing
  let checkTimer;
  input.addEventListener('input', () => {
    // Debounce the check to avoid too many updates
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      const hasPrivacyIssues = detectPrivacyIssues(input.value);
      warning.hidden = !hasPrivacyIssues;
    }, 300);
  });

  // Load and render existing messages on startup.
  const msgs = await fetchMessages();
  renderMessages(msgs);

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
