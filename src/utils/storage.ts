// LocalStorage utilities for data persistence
import type { AppState, SRSCard, Mnemonic, UserProgress, AppSettings, StudySession } from '../types';

const STORAGE_KEY = 'galactic-shepard-app';

// Default app state
const defaultProgress: UserProgress = {
    cardsLearned: 0,
    cardsReviewed: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyTime: 0,
};

const defaultSettings: AppSettings = {
    theme: 'dark',
    dailyNewCards: 20,
    dailyReviewLimit: 100,
    showReadingsFirst: false,
    autoFlipDelay: null,
    selectedLevels: [5],
};

const defaultState: AppState = {
    srsCards: {},
    mnemonics: {},
    grammarProgress: {},
    progress: defaultProgress,
    settings: defaultSettings,
    sessions: [],
};

// Load state from localStorage
export function loadState(): AppState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle missing fields in old data
            return {
                ...defaultState,
                ...parsed,
                progress: { ...defaultProgress, ...parsed.progress },
                settings: { ...defaultSettings, ...parsed.settings },
                grammarProgress: parsed.grammarProgress || {},
            };
        }
    } catch (error) {
        console.error('Failed to load state:', error);
    }
    return defaultState;
}

// Save state to localStorage
export function saveState(state: AppState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save state:', error);
    }
}

// Update SRS card
export function updateSRSCard(cardId: string, card: SRSCard): void {
    const state = loadState();
    state.srsCards[cardId] = card;
    saveState(state);
}

// Get SRS card or create new one
export function getSRSCard(cardId: string, cardType: 'kanji' | 'vocabulary'): SRSCard {
    const state = loadState();
    if (state.srsCards[cardId]) {
        return state.srsCards[cardId];
    }
    // Create new card
    const newCard: SRSCard = {
        cardId,
        cardType,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: Date.now(),
        lastReview: null,
    };
    return newCard;
}

// Save mnemonic
export function saveMnemonic(cardId: string, cardType: 'kanji' | 'vocabulary', text: string): void {
    const state = loadState();
    const now = Date.now();
    state.mnemonics[cardId] = {
        cardId,
        cardType,
        text,
        createdAt: state.mnemonics[cardId]?.createdAt || now,
        updatedAt: now,
    };
    saveState(state);
}

// Get mnemonic
export function getMnemonic(cardId: string): Mnemonic | null {
    const state = loadState();
    return state.mnemonics[cardId] || null;
}

// Update progress
export function updateProgress(updates: Partial<UserProgress>): void {
    const state = loadState();
    state.progress = { ...state.progress, ...updates };

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (state.progress.lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (state.progress.lastStudyDate === yesterday) {
            state.progress.currentStreak += 1;
        } else if (state.progress.lastStudyDate !== today) {
            state.progress.currentStreak = 1;
        }
        state.progress.lastStudyDate = today;
        state.progress.longestStreak = Math.max(
            state.progress.longestStreak,
            state.progress.currentStreak
        );
    }

    saveState(state);
}

// Update settings
export function updateSettings(updates: Partial<AppSettings>): void {
    const state = loadState();
    state.settings = { ...state.settings, ...updates };
    saveState(state);
}

// Get settings
export function getSettings(): AppSettings {
    return loadState().settings;
}

// Get progress
export function getProgress(): UserProgress {
    return loadState().progress;
}

// Add study session
export function addSession(session: StudySession): void {
    const state = loadState();
    state.sessions.push(session);
    // Keep only last 30 days of sessions
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    state.sessions = state.sessions.filter(s => s.startTime > thirtyDaysAgo);
    saveState(state);
}

// Export data for backup
export function exportData(): string {
    return JSON.stringify(loadState(), null, 2);
}

// Import data from backup
export function importData(jsonString: string): boolean {
    try {
        const data = JSON.parse(jsonString);
        if (data.srsCards && data.progress && data.settings) {
            saveState(data);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// Clear all data
export function clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
}
