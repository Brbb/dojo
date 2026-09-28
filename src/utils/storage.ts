// LocalStorage utilities for data persistence
import type { AppState, SRSCard, Mnemonic, UserProgress, AppSettings, StudySession } from '../types';
import { createSRSCard, migrateSRSCard } from './srs';

const STORAGE_KEY = 'galactic-shepard-app';
const CURRENT_SCHEMA_VERSION = 3;

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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    fastPassCards: {},
    srsCards: {},
    mnemonics: {},
    grammarProgress: {},
    kanjiExampleOverrides: {},
    progress: defaultProgress,
    settings: defaultSettings,
    sessions: [],
    customCards: [],
};

function migrateState(storedState: Partial<AppState>): AppState {
    const migratedCards = Object.fromEntries(
        Object.entries(storedState.srsCards || {}).map(([cardId, card]) => [
            cardId,
            migrateSRSCard(card),
        ])
    );

    return {
        ...defaultState,
        ...storedState,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        fastPassCards: storedState.fastPassCards || {},
        srsCards: migratedCards,
        progress: { ...defaultProgress, ...storedState.progress },
        settings: { ...defaultSettings, ...storedState.settings },
        grammarProgress: storedState.grammarProgress || {},
        kanjiExampleOverrides: storedState.kanjiExampleOverrides || {},
        customCards: storedState.customCards || [],
        sessions: storedState.sessions || [],
    };
}

// Load state from localStorage
export function loadState(): AppState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<AppState>;
            return migrateState(parsed);
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
    return createSRSCard(cardId, cardType);
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
    // Un-escape Unicode sequences so Japanese characters (kanji, katakana, hiragana)
    // are preserved as readable UTF-8 in the exported file
    const json = JSON.stringify(loadState(), null, 2);
    return json.replace(/\\u[\da-fA-F]{4}/g, (match) => {
        return String.fromCodePoint(parseInt(match.replace('\\u', ''), 16));
    });
}

// Import data from backup
export function importData(jsonString: string): boolean {
    try {
        const data = JSON.parse(jsonString) as Partial<AppState>;
        if (data.srsCards && data.progress && data.settings) {
            saveState(migrateState(data));
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
