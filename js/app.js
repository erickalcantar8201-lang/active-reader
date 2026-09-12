import { createApp, ref, computed, onErrorCaptured, onMounted, watch } from 'vue';
import { store, actions, debounce } from './store.js';
import { generateFeedback } from './mockAI.js';

// --- Error Boundary Component ---
const ErrorBoundary = {
  setup(props, { slots }) {
    const error = ref(null);
    const info = ref('');
    
    onErrorCaptured((err, instance, infoStr) => {
      console.error('Captured in ErrorBoundary:', err, infoStr);
      error.value = err;
      info.value = infoStr;
      return false; // stop propagation
    });

    const resetError = () => {
      error.value = null;
      window.location.hash = '';
      window.location.reload();
    };

    return { error, info, resetError, slots };
  },
  template: `
    <div v-if="error" class="p-6 h-screen flex flex-col justify-center items-center bg-white dark:bg-gray-900 text-center">
      <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
      </div>
      <h2 class="text-2xl font-bold mb-2">Something went wrong.</h2>
      <p class="text-gray-500 mb-6 max-w-xs">An unexpected error occurred in the application.</p>
      
      <button @click="resetError" class="bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-xl active:scale-95 transition mb-6">
        Return Home
      </button>
      
      <details class="text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-xs font-mono w-full max-w-sm overflow-auto max-h-48 border border-gray-200 dark:border-gray-700 cursor-pointer">
        <summary class="font-bold text-gray-700 dark:text-gray-300 select-none">Technical Details</summary>
        <div class="mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap">{{ error.toString() }}</div>
        <div class="mt-1 text-gray-500">{{ info }}</div>
        <div v-if="error.stack" class="mt-1 text-gray-500 whitespace-pre-wrap">{{ error.stack }}</div>
      </details>
    </div>
    <slot v-else></slot>
  `
};

// --- Debug Panel ---
const DebugPanel = {
  props: ['currentPage', 'currentParams'],
  setup() {
    const show = ref(false);
    onMounted(() => {
      if (window.location.search.includes('debug=1')) show.value = true;
    });
    return { store, show };
  },
  template: `
    <div v-if="show" class="fixed bottom-20 right-4 bg-black/80 text-green-400 font-mono text-[10px] p-3 rounded-lg z-50 backdrop-blur pointer-events-none w-48 shadow-lg border border-green-500/30">
      <div class="font-bold border-b border-green-500/30 pb-1 mb-1 text-white">Debug Panel</div>
      <div>Route: {{ currentPage }}</div>
      <div>Params: {{ JSON.stringify(currentParams) }}</div>
      <div>Books: {{ store.books.length }}</div>
      <div>Sessions: {{ store.sessions.length }}</div>
      <div>Concepts: {{ store.concepts.length }}</div>
      <div>Version: {{ store.schemaVersion }}</div>
      <div v-if="store._meta.isCorrupted" class="text-red-400 font-bold mt-1">STATE CORRUPTED</div>
    </div>
  `
};

const App = {
  components: { ErrorBoundary, DebugPanel },
  setup() {
    const currentPage = ref('Home'); 
    const currentParams = ref({});
    
    const navigate = (page, params = {}) => {
      // Safety checks before navigation
      if (page === 'BookDetail' && !store.books.some(b => b.id === params.bookId)) {
        console.warn('Attempted to navigate to unknown book');
        page = 'Home';
        params = {};
      }
      if (page === 'Feedback' && !store.sessions.some(s => s.id === params.sessionId)) {
        console.warn('Attempted to navigate to unknown session');
        page = 'Home';
        params = {};
      }
      
      currentPage.value = page;
      currentParams.value = params;
      window.scrollTo(0,0);
    };

    const dueReviews = computed(() => {
      if (!store.concepts) return [];
      const now = Date.now();
      return store.concepts.filter(c => c && c.nextReviewDate <= now);
    });

    const recentConcepts = computed(() => {
      if (!store.concepts) return [];
      return [...store.concepts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    });

    // Handle corrupted state natively
    const confirmReset = () => {
      if (confirm('Are you sure you want to completely erase all data? This cannot be undone.')) {
        actions.resetData();
      }
    };

    return {
      store,
      actions,
      currentPage,
      currentParams,
      navigate,
      dueReviews,
      recentConcepts,
      confirmReset
    };
  },
  template: `
    <ErrorBoundary>
      <div class="flex flex-col min-h-screen relative">
        <header class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
          <h1 class="text-xl font-bold tracking-tight cursor-pointer" @click="navigate('Home')">
            <i class="fa-solid fa-brain mr-2 text-blue-500"></i>ActiveReader
          </h1>
          <button v-if="currentPage !== 'Home'" @click="navigate('Home')" class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 p-2 -mr-2">
            Cancel
          </button>
        </header>

        <!-- Corrupted State Warning -->
        <div v-if="store._meta.isCorrupted" class="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-200 dark:border-red-800">
          <h2 class="text-red-800 dark:text-red-400 font-bold flex items-center mb-2"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Data Corruption Detected</h2>
          <p class="text-xs text-red-700 dark:text-red-300 mb-3">Your local save file was malformed. A blank slate was loaded to prevent crashes, but your old corrupted data is backed up.</p>
          <div class="flex gap-2">
            <button v-if="store._meta.hasBackup" @click="actions.restoreBackup" class="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg active:scale-95">Restore Backup</button>
            <button @click="confirmReset" class="px-3 py-1.5 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-xs font-bold rounded-lg active:scale-95">Hard Reset</button>
          </div>
        </div>

        <main class="flex-grow p-4">
          <transition name="fade" mode="out-in">
            <HomeView v-if="currentPage === 'Home'" :navigate="navigate" :dueReviews="dueReviews" :recentConcepts="recentConcepts" />
            <NewSessionView v-else-if="currentPage === 'NewSession'" :navigate="navigate" />
            <SessionFlowView v-else-if="currentPage === 'SessionFlow'" :navigate="navigate" :sessionData="currentParams.sessionData" />
            <FeedbackView v-else-if="currentPage === 'Feedback'" :navigate="navigate" :sessionId="currentParams.sessionId" />
            <LibraryView v-else-if="currentPage === 'Library'" :navigate="navigate" />
            <BookDetailView v-else-if="currentPage === 'BookDetail'" :navigate="navigate" :bookId="currentParams.bookId" />
            <ReviewQueueView v-else-if="currentPage === 'ReviewQueue'" :navigate="navigate" />
          </transition>
        </main>

        <nav v-if="currentPage === 'Home' || currentPage === 'Library'" class="fixed bottom-0 w-full max-w-md bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 pb-safe z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] dark:shadow-none">
          <button @click="navigate('Home')" :class="['flex flex-col items-center p-2 rounded-lg transition-colors', currentPage === 'Home' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300']">
            <i class="fa-solid fa-house mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button @click="navigate('Library')" :class="['flex flex-col items-center p-2 rounded-lg transition-colors', currentPage === 'Library' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300']">
            <i class="fa-solid fa-book-open mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wider">Library</span>
          </button>
        </nav>

        <DebugPanel :currentPage="currentPage" :currentParams="currentParams" />
      </div>
    </ErrorBoundary>
  `
};

const HomeView = {
  props: ['navigate', 'dueReviews', 'recentConcepts'],
  template: `
    <div class="space-y-8 pb-10">
      <section>
        <button @click="navigate('NewSession')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-sm transition transform active:scale-95 flex items-center justify-center text-lg focus:ring-4 focus:ring-blue-500/50 outline-none">
          <i class="fa-solid fa-plus mr-2"></i> New Reading Session
        </button>
      </section>

      <section v-if="dueReviews && dueReviews.length > 0">
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Due for Review</h2>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition active:scale-95" @click="navigate('ReviewQueue')">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-bold text-yellow-800 dark:text-yellow-400">{{ dueReviews.length }} concepts to review</p>
              <p class="text-sm text-yellow-700 dark:text-yellow-500">Strengthen your memory now.</p>
            </div>
            <i class="fa-solid fa-chevron-right text-yellow-500"></i>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Concepts</h2>
        <div v-if="recentConcepts && recentConcepts.length > 0" class="space-y-3">
          <div v-for="concept in recentConcepts" :key="concept.id" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
            <h3 class="font-bold mb-1">{{ concept.name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{{ concept.explanation }}</p>
            <div class="mt-2 flex items-center">
               <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300 tracking-wide uppercase">{{ concept.status }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500">No concepts extracted yet. Start a session!</p>
        </div>
      </section>
    </div>
  `
};

const NewSessionView = {
  props: ['navigate'],
  setup(props) {
    const isAddingNewBook = ref(!store.books || store.books.length === 0);
    const bookId = ref(store.books && store.books.length > 0 ? store.books[0].id : '');
    const newBookTitle = ref('');
    const newBookAuthor = ref('');
    const chapter = ref('');
    const pages = ref('');
    const timeMinutes = ref(20);
    const language = ref('English');
    const isSubmitting = ref(false);

    const startSession = () => {
      if (isSubmitting.value) return;
      
      let finalBookId = bookId.value;
      if (isAddingNewBook.value) {
        if (!newBookTitle.value.trim()) {
          alert('Book title cannot be empty.');
          return;
        }
        try {
          const book = actions.addBook(newBookTitle.value, newBookAuthor.value);
          finalBookId = book.id;
        } catch (e) {
          console.error("Error adding book:", e);
          return;
        }
      }
      
      if (!finalBookId) {
        alert('Please select or create a book.');
        return;
      }
      
      if (timeMinutes.value <= 0 || isNaN(timeMinutes.value)) {
        alert('Reading time must be a positive number.');
        return;
      }
      
      isSubmitting.value = true;
      const sessionData = {
        bookId: finalBookId,
        chapter: chapter.value.trim(),
        pages: pages.value.trim(),
        timeMinutes: Number(timeMinutes.value),
        language: language.value,
      };
      
      props.navigate('SessionFlow', { sessionData });
    };

    return { store, bookId, newBookTitle, newBookAuthor, chapter, pages, timeMinutes, language, isAddingNewBook, isSubmitting, startSession };
  },
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold mb-2">Create Session</h2>
        <p class="text-gray-500 text-sm">Close the book. Let's see what you remember.</p>
      </div>

      <form @submit.prevent="startSession" class="space-y-5">
        <div>
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Book <span class="text-red-500">*</span></label>
          <select v-if="!isAddingNewBook" v-model="bookId" class="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
            <option v-for="book in store.books" :key="book.id" :value="book.id">{{ book.title }}</option>
          </select>
          <button v-if="!isAddingNewBook" type="button" @click="isAddingNewBook = true" class="mt-2 text-sm text-blue-600 font-medium p-1">
            <i class="fa-solid fa-plus mr-1"></i> Add new book
          </button>
          
          <div v-if="isAddingNewBook" class="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <input v-model="newBookTitle" placeholder="Book Title" required class="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            <input v-model="newBookAuthor" placeholder="Author (optional)" class="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            <button v-if="store.books && store.books.length > 0" type="button" @click="isAddingNewBook = false" class="text-sm text-gray-500 font-medium">Cancel</button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Chapter / Section</label>
          <input v-model="chapter" class="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Chapter 4 (Optional)" />
        </div>

        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pages</label>
            <input v-model="pages" class="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional" />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Mins Read <span class="text-red-500">*</span></label>
            <input v-model.number="timeMinutes" type="number" min="1" required class="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Session Language</label>
          <div class="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button type="button" @click="language = 'English'" :class="['flex-1 py-2.5 rounded-lg text-sm font-bold transition-all', language === 'English' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500']">English</button>
            <button type="button" @click="language = 'Spanish'" :class="['flex-1 py-2.5 rounded-lg text-sm font-bold transition-all', language === 'Spanish' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500']">Spanish</button>
          </div>
        </div>

        <div class="pt-4">
          <button type="submit" :disabled="isSubmitting" :class="['w-full font-bold py-4 rounded-xl shadow-sm text-lg transition outline-none', isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black dark:bg-white dark:text-black text-white active:scale-95 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600']">
            {{ isSubmitting ? 'Preparing...' : 'Start Recall' }}
          </button>
        </div>
      </form>
    </div>
  `
};

const SessionFlowView = {
  props: ['navigate', 'sessionData'],
  setup(props) {
    if (!props.sessionData) {
       // Safety fallback if accessed without params
       props.navigate('Home');
       return {};
    }

    const step = ref(0);
    const isSubmitting = ref(false);
    const aiError = ref(false);
    const savedSessionId = ref(null);
    
    const questions = [
      { id: 'mainIdea', title: 'What is the main idea?', desc: 'Explain what you understood without looking at the book.' },
      { id: 'whyMatters', title: 'Why does it matter?', desc: 'Explain the mechanism or why the idea is important.' },
      { id: 'example', title: 'Give your own example.', desc: 'Do NOT simply reproduce the example from the book.' },
      { id: 'limitations', title: 'Where could this idea fail?', desc: 'What are its limitations, assumptions, or situations where it may not work?' },
      { id: 'connections', title: 'Connect it.', desc: 'How does it connect with something you already know?' },
      { id: 'apply', title: 'How could you apply it?', desc: 'Force the answer to become operational. What would you actually DO differently?' }
    ];

    const answers = ref({
      mainIdea: '',
      whyMatters: '',
      example: '',
      limitations: '',
      connections: '',
      apply: ''
    });

    const isSpanishClarificationOpen = ref(false);
    const spanishClarification = ref('');

    // Restore draft if exists
    onMounted(() => {
      const draft = actions.loadDraft();
      if (draft && typeof draft === 'object' && draft.bookId === props.sessionData.bookId) {
        if (confirm('A previous unfinished session was found. Do you want to restore it?')) {
          answers.value = { ...answers.value, ...draft.answers };
          if (draft.step !== undefined) step.value = draft.step;
          if (draft.spanishClarification) {
             spanishClarification.value = draft.spanishClarification;
             isSpanishClarificationOpen.value = true;
          }
        } else {
          actions.clearDraft();
        }
      }
    });

    const saveDraftDebounced = debounce(() => {
      actions.saveDraft({
        bookId: props.sessionData.bookId,
        answers: answers.value,
        step: step.value,
        spanishClarification: spanishClarification.value
      });
    }, 500);

    watch([answers, step, spanishClarification], () => {
      saveDraftDebounced();
    }, { deep: true });

    const nextStep = () => {
      if (answers.value[questions[step.value].id].trim() === '') return;
      
      if (step.value < questions.length - 1) {
        step.value++;
        isSpanishClarificationOpen.value = false;
        spanishClarification.value = '';
      } else {
        finishSession();
      }
    };

    const submitToAI = async (sessionId) => {
      isSubmitting.value = true;
      aiError.value = false;
      try {
        const feedback = await generateFeedback(answers.value, props.sessionData.language);
        actions.updateSession(sessionId, { feedback });
        
        // Auto-extract concept if AI succeeds
        const conceptTitle = answers.value.mainIdea.trim().split(/\s+/).slice(0, 6).join(' ') + '...';
        actions.addConcept({
          bookId: props.sessionData.bookId,
          name: conceptTitle,
          explanation: answers.value.mainIdea.trim(),
          example: answers.value.example.trim(),
          limitations: answers.value.limitations.trim(),
          application: answers.value.apply.trim(),
          sessionId: sessionId
        });

        actions.clearDraft();
        props.navigate('Feedback', { sessionId: sessionId });
      } catch (e) {
        console.error("AI feedback process failed", e);
        aiError.value = true;
      } finally {
        isSubmitting.value = false;
      }
    };

    const finishSession = () => {
      isSubmitting.value = true;
      try {
        // Save base session immediately so data is safe
        const session = actions.addSession({
          ...props.sessionData,
          answers: { ...answers.value },
          spanishClarification: spanishClarification.value
        });
        savedSessionId.value = session.id;
        
        // Now attempt AI
        submitToAI(session.id);
      } catch (e) {
        console.error("Failed to save session data completely:", e);
        alert('Critical error saving session locally. Please ensure you have space.');
        isSubmitting.value = false;
      }
    };

    const retryAI = () => {
       if (savedSessionId.value) submitToAI(savedSessionId.value);
    };
    
    const continueWithoutAI = () => {
       actions.clearDraft();
       props.navigate('Home');
    };

    return { step, questions, answers, nextStep, isSubmitting, aiError, retryAI, continueWithoutAI, isSpanishClarificationOpen, spanishClarification, language: props.sessionData?.language || 'English' };
  },
  template: `
    <div v-if="sessionData" class="h-[80vh] flex flex-col relative">
      <div v-if="!isSubmitting && !aiError" class="flex gap-1 mb-6">
        <div v-for="(q, idx) in questions" :key="q.id" 
             :class="['h-1.5 flex-1 rounded-full transition-colors duration-300', idx <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800']">
        </div>
      </div>

      <div v-if="!isSubmitting && !aiError" class="flex-grow flex flex-col">
        <transition name="slide" mode="out-in">
          <div :key="step" class="flex-grow flex flex-col h-full">
            <h2 class="text-2xl md:text-3xl font-bold mb-2">{{ questions[step].title }}</h2>
            <p class="text-gray-500 mb-6 text-sm md:text-base">{{ questions[step].desc }}</p>
            
            <textarea 
              v-model="answers[questions[step].id]" 
              class="w-full flex-grow p-4 text-base md:text-lg bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
              placeholder="Type your answer here..."
              autofocus
            ></textarea>
            
            <div v-if="language === 'English'" class="mt-4">
              <button v-if="!isSpanishClarificationOpen" @click="isSpanishClarificationOpen = true" class="text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center p-2 -ml-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition-colors">
                <i class="fa-solid fa-language mr-2"></i> Spanish clarification
              </button>
              <div v-else class="mt-2 animate-fade-in">
                <label class="text-[10px] text-gray-500 uppercase font-bold mb-1 block tracking-wider">Express the idea in Spanish first</label>
                <textarea v-model="spanishClarification" class="w-full p-3 text-sm bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Escribe tu idea en español..."></textarea>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Loading State -->
      <div v-else-if="isSubmitting" class="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
        <i class="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-6"></i>
        <h2 class="text-xl font-bold mb-2">Analyzing your answers...</h2>
        <p class="text-gray-500 px-4 max-w-sm">Generating feedback on your understanding, application, and English.</p>
      </div>
      
      <!-- AI Error State -->
      <div v-else-if="aiError" class="flex-grow flex flex-col items-center justify-center text-center animate-fade-in p-4">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid fa-robot text-3xl text-red-500"></i>
        </div>
        <h2 class="text-xl font-bold mb-2 text-red-600 dark:text-red-400">AI Feedback Failed</h2>
        <p class="text-gray-700 dark:text-gray-300 mb-6 max-w-xs font-medium">Your reading session was successfully saved locally, but the AI tutor failed to generate feedback.</p>
        <div class="w-full space-y-3">
          <button @click="retryAI" class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg active:scale-95 transition shadow-sm">
            <i class="fa-solid fa-rotate-right mr-2"></i> Retry Feedback
          </button>
          <button @click="continueWithoutAI" class="w-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl text-lg active:scale-95 transition">
            Continue to Home
          </button>
        </div>
      </div>

      <div v-if="!isSubmitting && !aiError" class="pt-6">
        <button @click="nextStep" :disabled="!answers[questions[step].id].trim()" :class="['w-full font-bold py-4 rounded-xl text-lg transition outline-none', answers[questions[step].id].trim() ? 'bg-black dark:bg-white text-white dark:text-black active:scale-95 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed']">
          {{ step === questions.length - 1 ? 'Finish & Get Feedback' : 'Next' }}
        </button>
      </div>
    </div>
  `
};

const FeedbackView = {
  props: ['navigate', 'sessionId'],
  setup(props) {
    const session = computed(() => {
      return store.sessions ? store.sessions.find(s => s.id === props.sessionId) : null;
    });
    
    // Safety check redirect
    onMounted(() => {
      if (!session.value || !session.value.feedback) {
        console.warn('Feedback View: Session or feedback missing', props.sessionId);
        props.navigate('Home');
      }
    });

    const feedback = computed(() => session.value?.feedback);
    const showAnswers = ref(false);

    return { session, feedback, showAnswers };
  },
  template: `
    <div v-if="session && feedback" class="space-y-8 pb-10">
      <div class="text-center mt-4">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 text-blue-600 dark:text-blue-400">
          <i class="fa-solid fa-ranking-star text-xl"></i>
        </div>
        <h2 class="text-2xl md:text-3xl font-bold">AI Feedback</h2>
        <p class="text-gray-500 mt-1 text-sm">Analysis of your recall session</p>
      </div>

      <!-- Scores -->
      <section class="grid grid-cols-2 gap-3 md:gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
          <div class="text-3xl font-black mb-1" :class="feedback.scores.conceptual >= 8 ? 'text-green-500' : 'text-yellow-500'">{{ feedback.scores.conceptual }}/10</div>
          <div class="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Conceptual</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
          <div class="text-3xl font-black mb-1" :class="feedback.scores.application >= 8 ? 'text-green-500' : 'text-yellow-500'">{{ feedback.scores.application }}/10</div>
          <div class="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Application</div>
        </div>
      </section>

      <!-- Challenge -->
      <section v-if="feedback.vagueApplicationChallenge" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-5 rounded-xl shadow-sm">
        <h3 class="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center text-sm md:text-base"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Application Check</h3>
        <p class="text-red-900 dark:text-red-300 text-sm italic mb-3 opacity-80 border-l-2 border-red-300 dark:border-red-700 pl-3">"{{ session.answers.apply }}"</p>
        <p class="text-red-800 dark:text-red-400 font-bold text-sm">{{ feedback.vagueApplicationChallenge }}</p>
      </section>

      <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div class="p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 class="font-bold uppercase tracking-wider text-[10px] md:text-xs text-gray-500">Analysis</h3>
        </div>
        <div class="p-4 space-y-4">
          <div v-for="(s, i) in feedback.strengths" :key="'s'+i" class="flex gap-3 text-sm md:text-base">
            <i class="fa-solid fa-circle-check text-green-500 mt-0.5"></i>
            <span class="text-gray-800 dark:text-gray-200 leading-snug">{{ s }}</span>
          </div>
          <div class="w-full h-px bg-gray-100 dark:bg-gray-700 my-2"></div>
          <div v-for="(w, i) in feedback.weaknesses" :key="'w'+i" class="flex gap-3 text-sm md:text-base">
            <i class="fa-solid fa-arrow-trend-up text-blue-500 mt-0.5"></i>
            <span class="text-gray-800 dark:text-gray-200 leading-snug">{{ w }}</span>
          </div>
        </div>
      </section>

      <section v-if="feedback.english" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-5 rounded-xl shadow-sm">
        <h3 class="font-bold text-blue-800 dark:text-blue-400 mb-4 uppercase tracking-wider text-[10px] md:text-xs">English Feedback</h3>
        <div class="flex gap-6 mb-5 border-b border-blue-200/50 dark:border-blue-800/50 pb-4">
          <div>
            <div class="font-black text-2xl text-blue-900 dark:text-blue-300">{{ feedback.english.scores.grammar }}/10</div>
            <div class="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-500">Grammar</div>
          </div>
          <div>
            <div class="font-black text-2xl text-blue-900 dark:text-blue-300">{{ feedback.english.scores.naturalness }}/10</div>
            <div class="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-500">Naturalness</div>
          </div>
        </div>
        
        <div class="space-y-4">
          <div v-for="(mistake, i) in feedback.english.mistakes" :key="i" class="text-sm">
            <div class="mb-1 text-gray-500 line-through decoration-red-400 dark:decoration-red-800">"{{ mistake.original }}"</div>
            <div class="mb-1 text-blue-800 dark:text-blue-300 font-bold">"{{ mistake.correction }}"</div>
            <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 p-2 rounded inline-block mt-1">{{ mistake.explanation }}</div>
          </div>
        </div>
      </section>

      <section class="bg-gray-100 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
        <h3 class="font-bold mb-2 uppercase tracking-wider text-[10px] md:text-xs text-gray-500"><i class="fa-regular fa-lightbulb mr-1"></i> Follow-up Challenge</h3>
        <p class="text-xs text-gray-500 mb-4">Think about these to deepen your understanding. No need to type.</p>
        <ul class="space-y-4">
          <li v-for="(q, i) in feedback.followUpQuestions" :key="i" class="text-gray-900 dark:text-gray-200 font-bold text-sm md:text-base leading-snug">
            {{ q }}
          </li>
        </ul>
      </section>

      <div class="pt-2 pb-8 flex flex-col gap-3">
        <button @click="navigate('Home')" class="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl text-lg transition active:scale-95 shadow-sm outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600">
          Done
        </button>
        <button @click="showAnswers = !showAnswers" class="w-full text-gray-500 text-sm font-bold py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95">
          {{ showAnswers ? 'Hide my original answers' : 'Review my original answers' }}
        </button>
      </div>
      
      <div v-if="showAnswers" class="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fade-in">
        <div v-for="(val, key) in session.answers" :key="key" class="text-sm">
          <div class="font-bold text-gray-400 uppercase text-[10px] mb-1 tracking-wider">{{ key }}</div>
          <div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-lg text-gray-800 dark:text-gray-200 shadow-sm">{{ val }}</div>
        </div>
      </div>
    </div>
  `
};

const LibraryView = {
  props: ['navigate'],
  setup() {
    return { books: store.books, sessions: store.sessions };
  },
  template: `
    <div class="space-y-6 pb-20">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Library</h2>
        <span class="text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">{{ books ? books.length : 0 }} Books</span>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div v-for="book in books" :key="book.id" @click="navigate('BookDetail', { bookId: book.id })" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex flex-col h-40 cursor-pointer shadow-sm hover:shadow-md active:scale-95 transition-all">
          <div class="flex-grow">
            <h3 class="font-bold leading-tight mb-1 line-clamp-3">{{ book.title }}</h3>
            <p class="text-xs text-gray-500 line-clamp-1">{{ book.author }}</p>
          </div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-2 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-1 rounded self-start">
            {{ sessions ? sessions.filter(s => s.bookId === book.id).length : 0 }} sessions
          </div>
        </div>
      </div>
      
      <div v-if="!books || books.length === 0" class="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-500">Your library is empty. Start reading!</p>
      </div>
    </div>
  `
};

const BookDetailView = {
  props: ['navigate', 'bookId'],
  setup(props) {
    const book = computed(() => {
      return store.books ? store.books.find(b => b.id === props.bookId) : null;
    });
    
    onMounted(() => {
      if (!book.value) {
        props.navigate('Library');
      }
    });

    const sessions = computed(() => {
      if (!store.sessions) return [];
      return store.sessions.filter(s => s.bookId === props.bookId).sort((a,b) => b.createdAt - a.createdAt);
    });
    
    const concepts = computed(() => {
      if (!store.concepts) return [];
      return store.concepts.filter(c => c.bookId === props.bookId);
    });
    
    return { book, sessions, concepts };
  },
  template: `
    <div v-if="book" class="space-y-6 pb-10">
      <div>
        <h2 class="text-2xl font-bold leading-tight">{{ book.title }}</h2>
        <p class="text-gray-500 mt-1">{{ book.author }}</p>
      </div>

      <div class="flex gap-3 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex-1 border border-blue-100 dark:border-blue-900/50 shadow-sm flex flex-col items-center justify-center">
          <div class="text-3xl font-black text-blue-800 dark:text-blue-400 mb-1">{{ sessions.length }}</div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-500">Sessions</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl flex-1 border border-green-100 dark:border-green-900/50 shadow-sm flex flex-col items-center justify-center">
          <div class="text-3xl font-black text-green-800 dark:text-green-400 mb-1">{{ concepts.length }}</div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-500">Concepts</div>
        </div>
      </div>

      <section>
        <h3 class="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">Saved Concepts</h3>
        <div class="space-y-3">
          <div v-for="concept in concepts" :key="concept.id" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm">
            <h4 class="font-bold text-sm md:text-base leading-tight">{{ concept.name }}</h4>
            <div class="flex items-center gap-2 mt-3">
              <span class="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded uppercase tracking-wider">{{ concept.status }}</span>
            </div>
          </div>
          <p v-if="concepts.length === 0" class="text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">No concepts extracted yet.</p>
        </div>
      </section>

      <section class="mt-8">
        <h3 class="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">Session History</h3>
        <div class="space-y-4 border-l-2 border-gray-200 dark:border-gray-800 ml-2 pl-4 py-2">
          <div v-for="session in sessions" :key="session.id" class="relative group">
            <div class="absolute w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full -left-[1.35rem] top-2 border-2 border-white dark:border-gray-900 group-hover:bg-blue-500 transition-colors"></div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors active:scale-[0.98]" @click="navigate('Feedback', { sessionId: session.id })">
              <div class="flex justify-between items-start mb-2">
                <div class="font-bold text-sm">{{ session.chapter || 'Session' }}</div>
                <div class="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{{ new Date(session.createdAt).toLocaleDateString() }}</div>
              </div>
              <div v-if="session.feedback" class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-4 mt-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg inline-flex">
                <span class="flex items-center gap-1"><i class="fa-solid fa-brain text-gray-400"></i> <span class="font-bold text-gray-900 dark:text-gray-100">{{ session.feedback.scores.conceptual }}</span></span>
                <span class="flex items-center gap-1"><i class="fa-solid fa-wrench text-gray-400"></i> <span class="font-bold text-gray-900 dark:text-gray-100">{{ session.feedback.scores.application }}</span></span>
              </div>
              <div v-else class="text-xs text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded inline-block mt-2">
                No feedback generated
              </div>
            </div>
          </div>
          <p v-if="sessions.length === 0" class="text-sm text-gray-500 italic">No sessions yet.</p>
        </div>
      </section>
    </div>
  `
};

const ReviewQueueView = {
  props: ['navigate'],
  setup(props) {
    const dueReviews = computed(() => {
      if (!store.concepts) return [];
      const now = Date.now();
      return store.concepts.filter(c => c && c.nextReviewDate <= now);
    });

    const currentReviewIndex = ref(0);
    const currentConcept = computed(() => dueReviews.value[currentReviewIndex.value]);
    
    const answer = ref('');
    const showOriginal = ref(false);

    const finishReview = (quality) => {
      try {
        const concept = currentConcept.value;
        if (!concept) return;
        
        let nextInterval = 86400000; // 1 day
        
        if (quality > 2) {
          if (concept.status === 'NEW' || concept.status === 'LEARNING') {
             concept.status = 'UNDERSTOOD';
             nextInterval = 7 * 86400000; // 7 days
          } else if (concept.status === 'UNDERSTOOD') {
             concept.status = 'RETAINED';
             nextInterval = 30 * 86400000; // 30 days
          } else {
             nextInterval = 90 * 86400000;
          }
        } else {
          concept.status = 'LEARNING';
          nextInterval = 86400000; // reset to 1 day
        }

        concept.nextReviewDate = Date.now() + nextInterval;
        if (!concept.retentionHistory) concept.retentionHistory = [];
        concept.retentionHistory.push({ date: Date.now(), quality });
        
        answer.value = '';
        showOriginal.value = false;
        
        // dueReviews automatically shrinks since nextReviewDate pushed to future
      } catch (e) {
        console.error("Error saving review:", e);
        alert("Failed to save review. Please try again.");
      }
    };

    return { store, dueReviews, currentConcept, answer, showOriginal, finishReview };
  },
  template: `
    <div class="space-y-6 pb-20 flex flex-col h-[80vh]">
      <div v-if="currentConcept" class="flex-grow flex flex-col h-full">
        <div class="mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
          <span>Review Queue</span>
          <span class="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">{{ dueReviews.length }} remaining</span>
        </div>
        
        <h2 class="text-2xl md:text-3xl font-bold mb-4">What do you remember about this idea?</h2>
        
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4 border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
          <h3 class="font-bold text-lg leading-tight">{{ currentConcept.name }}</h3>
          <p v-if="store.books" class="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">
            <i class="fa-solid fa-book mr-1"></i> {{ store.books.find(b => b.id === currentConcept.bookId)?.title || 'Unknown Book' }}
          </p>
        </div>
        
        <textarea 
          v-if="!showOriginal"
          v-model="answer" 
          class="w-full flex-grow p-4 text-base md:text-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
          placeholder="Recall what this means, its limitations, and how to apply it..."
        ></textarea>
        
        <div v-else class="flex-grow overflow-y-auto space-y-4 pr-1">
          <div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl shadow-sm">
            <h4 class="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase mb-2 tracking-wider"><i class="fa-solid fa-pen mr-1"></i> Your current recall</h4>
            <p class="text-sm md:text-base text-gray-800 dark:text-gray-200">{{ answer || "Nothing written." }}</p>
          </div>
          
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div class="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-gray-100 dark:border-gray-700">
              <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Original Explanation</h4>
            </div>
            <p class="p-4 text-sm md:text-base">{{ currentConcept.explanation }}</p>
          </div>
          
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div class="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-gray-100 dark:border-gray-700">
              <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Original Application</h4>
            </div>
            <p class="p-4 text-sm md:text-base">{{ currentConcept.application }}</p>
          </div>
        </div>
        
        <div class="pt-6 mt-auto">
          <button v-if="!showOriginal" @click="showOriginal = true" class="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl text-lg transition active:scale-95 shadow-sm outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600">
            Compare Answer
          </button>
          
          <div v-else class="space-y-3 animate-fade-in">
            <p class="text-center text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">How well did you remember?</p>
            <div class="grid grid-cols-3 gap-3">
              <button @click="finishReview(1)" class="bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 font-bold py-4 rounded-xl active:scale-95 transition hover:bg-red-100 dark:hover:bg-red-900/40">Forgot</button>
              <button @click="finishReview(3)" class="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 font-bold py-4 rounded-xl active:scale-95 transition hover:bg-yellow-100 dark:hover:bg-yellow-900/40">Hard</button>
              <button @click="finishReview(5)" class="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50 font-bold py-4 rounded-xl active:scale-95 transition hover:bg-green-100 dark:hover:bg-green-900/40">Easy</button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
        <div class="w-24 h-24 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <i class="fa-solid fa-check text-5xl text-green-500"></i>
        </div>
        <h2 class="text-2xl font-bold mb-2">You're all caught up!</h2>
        <p class="text-gray-500 text-sm max-w-xs">Your memory is strengthening. Come back tomorrow for more reviews.</p>
        <button @click="navigate('Home')" class="mt-8 bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-xl active:scale-95 transition shadow-sm">Go Home</button>
      </div>
    </div>
  `
};

const app = createApp(App);
// Suppress warnings in production for cleaner console
app.config.warnHandler = () => null;

app.component('HomeView', HomeView);
app.component('NewSessionView', NewSessionView);
app.component('SessionFlowView', SessionFlowView);
app.component('FeedbackView', FeedbackView);
app.component('LibraryView', LibraryView);
app.component('BookDetailView', BookDetailView);
app.component('ReviewQueueView', ReviewQueueView);

// Global unhandled error fallback for Vue
app.config.errorHandler = (err, instance, info) => {
  console.error('Global Vue Error:', err, info);
  // The ErrorBoundary will catch most component errors, this is a fallback.
};

app.mount('#app');
