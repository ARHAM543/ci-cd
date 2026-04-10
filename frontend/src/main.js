import './style.css';

// ── Configuration ────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

// ── State ────────────────────────────────────────────────────────────────────
let notes = [];
let isConnected = false;
let isLoading = true;

// ── Icons (inline SVG) ──────────────────────────────────────────────────────
const icons = {
  send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
};

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__logo">📝</div>
      <h1 class="app-header__title">Notes App</h1>
      <p class="app-header__subtitle">Capture ideas instantly — powered by FastAPI & Azure</p>
      <div class="status-badge ${isConnected ? 'status-badge--connected' : 'status-badge--disconnected'}">
        <span class="status-badge__dot"></span>
        ${isConnected ? 'API Connected' : 'API Disconnected'}
      </div>
    </header>

    <section class="composer" id="composer-section">
      <div class="composer__input-wrapper">
        <textarea
          id="note-input"
          class="composer__input"
          placeholder="What's on your mind?"
          rows="1"
          aria-label="Write a new note"
        ></textarea>
        <button class="composer__btn" id="add-btn" disabled>
          ${icons.send}
          <span>Add Note</span>
        </button>
      </div>
    </section>

    ${renderNotesSection()}

    <div class="toast-container" id="toast-container"></div>
  `;

  bindEvents();
}

function renderNotesSection() {
  if (isLoading) {
    return renderSkeleton();
  }

  if (notes.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">✨</div>
        <h2 class="empty-state__title">No notes yet</h2>
        <p class="empty-state__subtitle">Start by typing something above — your first note is just a click away.</p>
      </div>
    `;
  }

  return `
    <div class="notes-toolbar">
      <p class="notes-toolbar__count"><span>${notes.length}</span> note${notes.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="notes-list" id="notes-list">
      ${notes
        .map(
          (note, idx) => `
        <article class="note-card" style="animation-delay: ${idx * 0.05}s" data-index="${idx}">
          <div class="note-card__index">${idx + 1}</div>
          <div class="note-card__body">
            <p class="note-card__text">${escapeHtml(note.text)}</p>
            <div class="note-card__meta">
              <span>${note.timestamp || ''}</span>
            </div>
          </div>
          <div class="note-card__actions">
            <button class="note-card__delete" data-index="${idx}" title="Delete note" aria-label="Delete note ${idx + 1}">
              ${icons.trash}
            </button>
          </div>
        </article>
      `
        )
        .join('')}
    </div>
  `;
}

function renderSkeleton() {
  return `
    <div class="skeleton">
      ${Array(3)
        .fill('')
        .map(
          () => `
        <div class="skeleton__card">
          <div class="skeleton__circle"></div>
          <div class="skeleton__lines">
            <div class="skeleton__line"></div>
            <div class="skeleton__line skeleton__line--short"></div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// ── Event Binding ────────────────────────────────────────────────────────────
function bindEvents() {
  const input = document.getElementById('note-input');
  const addBtn = document.getElementById('add-btn');

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    addBtn.disabled = input.value.trim().length === 0;
  });

  // Submit on Enter (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim()) {
        addNote();
      }
    }
  });

  // Add button
  addBtn.addEventListener('click', () => {
    addNote();
  });

  // Delete buttons (event delegation)
  const notesList = document.getElementById('notes-list');
  if (notesList) {
    notesList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.note-card__delete');
      if (deleteBtn) {
        const index = parseInt(deleteBtn.dataset.index, 10);
        deleteNote(index);
      }
    });
  }
}

// ── API Calls ────────────────────────────────────────────────────────────────
async function loadNotes() {
  isLoading = true;
  render();

  try {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    notes = data;
    isConnected = true;
  } catch (err) {
    console.error('Failed to load notes:', err);
    isConnected = false;
    showToast('Failed to connect to the API', 'error');
  } finally {
    isLoading = false;
    render();
  }
}

async function addNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;

  // Disable button during request
  const addBtn = document.getElementById('add-btn');
  addBtn.disabled = true;

  try {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timestamp }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    showToast('Note added successfully', 'success');
    await loadNotes();

    // Re-focus input after render
    const newInput = document.getElementById('note-input');
    if (newInput) newInput.focus();
  } catch (err) {
    console.error('Failed to add note:', err);
    showToast('Failed to add note', 'error');
    addBtn.disabled = false;
  }
}

async function deleteNote(index) {
  // Client-side delete (the backend doesn't have a delete endpoint yet)
  notes.splice(index, 1);
  render();
  showToast('Note deleted', 'success');
}

// ── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `${type === 'success' ? '✓' : '✕'} ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2500);
}

// ── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Init ─────────────────────────────────────────────────────────────────────
render();
loadNotes();
