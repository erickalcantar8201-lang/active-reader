import { reactive, watch } from 'vue';

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'activeReaderData';
const BACKUP_KEY = 'activeReaderBackup';
const DRAFT_KEY = 'activeReaderDraft';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createDefaultData = () => ({
  schemaVersion: SCHEMA_VERSION,
  books: [
    {
      id: 'demo-book-1',
      title: 'The Most Important Thing',
      author: 'Howard Marks',
      createdAt: Date.now()
    }
  ],
  sessions: [],
  concepts: [
    {
      id: 'demo-concept-1',
      bookId: 'demo-book-1',
      name: 'Market Efficiency and Its Limitations',
      explanation: 'Markets are mostly efficient, meaning prices reflect available information, but they are not always perfectly efficient. The mistakes of the crowd create opportunities.',
      example: 'During the 2008 financial crisis, panic drove prices of even good assets well below their intrinsic value.',
      limitations: 'It is very hard to know if you actually have an informational or analytical edge, or if you are the one making the mistake.',
      application: 'Before buying, I must write down exactly why I think the consensus is wrong and what my specific edge is.',
      status: 'LEARNING', // NEW, LEARNING, UNDERSTOOD, RETAINED
      createdAt: Date.now(),
      nextReviewDate: Date.now() - 10000, // Due for review
      retentionHistory: []
    }
  ],
  reviews: []
});

// Utility to merge missing properties
function migrateData(data) {
  if (!data || typeof data !== 'object') return createDefaultData();
  
  const migrated = { ...data };
  migrated.schemaVersion = SCHEMA_VERSION;
  migrated.books = Array.isArray(migrated.books) ? migrated.books : [];
  migrated.sessions = Array.isArray(migrated.sessions) ? migrated.sessions : [];
  migrated.concepts = Array.isArray(migrated.concepts) ? migrated.concepts : [];
  migrated.reviews = Array.isArray(migrated.reviews) ? migrated.reviews : [];

  // Ensure items have IDs
  migrated.books = migrated.books.map(b => ({ id: generateId(), ...b }));
  migrated.sessions = migrated.sessions.map(s => ({ id: generateId(), ...s }));
  migrated.concepts = migrated.concepts.map(c => ({ id: generateId(), ...c }));

  return migrated;
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: createDefaultData(), corrupted: false };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON structure');
    return { data: migrateData(parsed), corrupted: false };
  } catch (err) {
    console.error('Failed to parse activeReaderData:', err);
    return { data: createDefaultData(), corrupted: true, rawCorrupted: raw };
  }
}

const { data: initialData, corrupted: isCorrupted, rawCorrupted } = loadData();

export const store = reactive({
  ...initialData,
  _meta: {
    isCorrupted,
    rawCorrupted,
    hasBackup: !!localStorage.getItem(BACKUP_KEY)
  }
});

let saveTimeout = null;
watch(() => ({
  books: store.books,
  sessions: store.sessions,
  concepts: store.concepts,
  reviews: store.reviews,
  schemaVersion: store.schemaVersion
}), (newVal) => {
  // Debounce the save to prevent performance issues on every tiny mutation
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
    } catch (e) {
      console.error('Failed to save store to localStorage:', e);
    }
  }, 300);
}, { deep: true });

export const actions = {
  createBackup() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        localStorage.setItem(BACKUP_KEY, current);
        store._meta.hasBackup = true;
      }
    } catch(e) {
      console.error('Failed to create backup:', e);
    }
  },
  restoreBackup() {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        localStorage.setItem(STORAGE_KEY, backup);
        window.location.reload(); // Hard reload to reset all reactive state
      }
    } catch(e) {
      console.error('Failed to restore backup:', e);
    }
  },
  resetData() {
    try {
      actions.createBackup(); // Backup before resetting just in case
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    } catch(e) {
      console.error('Failed to reset data:', e);
    }
  },
  addBook(title, author) {
    if (!title || title.trim() === '') throw new Error('Book title is required');
    const newBook = { id: generateId(), title: title.trim(), author: (author || '').trim(), createdAt: Date.now() };
    store.books.push(newBook);
    return newBook;
  },
  addSession(session) {
    this.createBackup(); // Major mutation, backup first
    const newSession = { ...session, id: generateId(), createdAt: Date.now() };
    store.sessions.push(newSession);
    return newSession;
  },
  updateSession(id, updates) {
    const index = store.sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      store.sessions[index] = { ...store.sessions[index], ...updates };
    } else {
      throw new Error('Session not found for update');
    }
  },
  addConcept(concept) {
    const newConcept = { 
      ...concept, 
      id: generateId(), 
      createdAt: Date.now(), 
      status: 'NEW',
      nextReviewDate: Date.now() + 86400000, // 1 day later
      retentionHistory: []
    };
    store.concepts.push(newConcept);
    return newConcept;
  },
  saveDraft(draft) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch(e) {
      console.error('Failed to save draft:', e);
    }
  },
  loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      console.error('Failed to load draft:', e);
      return null;
    }
  },
  clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch(e) {}
  }
};

// Debounce utility for UI components
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
