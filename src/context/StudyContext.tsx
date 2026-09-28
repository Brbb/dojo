import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
    AppState, SRSCard, SRSRating, JLPTLevel, CardType,
    UserProgress, AppSettings, Mnemonic, CustomCard, KanjiExample
} from '../types';
import { loadState, saveState } from '../utils/storage';
import { calculateNextReview, createSRSCard, getDueCards, calculateStats, getCardStatus, type CardStatus } from '../utils/srs';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import { FAST_PASS_BOOK_IMPORTS, isFastPassCard, mergeFastPassBookCards } from '../utils/fastPass';

// Action types
type Action =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'SET_FAST_PASS'; payload: { cardIds: string[]; enabled: boolean } }
    | { type: 'RATE_CARD'; payload: { cardId: string; cardType: CardType; rating: SRSRating } }
    | { type: 'SAVE_MNEMONIC'; payload: { cardId: string; cardType: CardType; text: string } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    | { type: 'UPDATE_PROGRESS'; payload: Partial<UserProgress> }
    | { type: 'ADD_TO_REVIEW'; payload: { cardId: string; cardType: CardType } }
    | { type: 'REMOVE_FROM_REVIEW'; payload: { cardId: string } }
    | { type: 'ADD_CUSTOM_CARD'; payload: { card: CustomCard } }
    | { type: 'DELETE_CUSTOM_CARD'; payload: { id: string } }
    | { type: 'SET_KANJI_EXAMPLES'; payload: { kanjiId: string; examples: KanjiExample[] } }
    | { type: 'TOGGLE_GRAMMAR_STUDIED'; payload: { pointId: string } }
    | { type: 'RESET_PROGRESS' };

// Initial state
const initialState: AppState = {
    schemaVersion: 4,
    fastPassCards: {},
    fastPassImports: [...FAST_PASS_BOOK_IMPORTS],
    srsCards: {},
    mnemonics: {},
    grammarProgress: {},
    kanjiExampleOverrides: {},
    progress: {
        cardsLearned: 0,
        cardsReviewed: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        totalStudyTime: 0,
    },
    settings: {
        theme: 'dark',
        dailyNewCards: 20,
        dailyReviewLimit: 100,
        showReadingsFirst: false,
        autoFlipDelay: null,
        selectedLevels: [5],
    },
    sessions: [],
    customCards: mergeFastPassBookCards([]),
};

// Reducer
function studyReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'LOAD_STATE':
            return {
                ...initialState,
                ...action.payload,
                // Ensure nested objects are also merged/initialized
                progress: { ...initialState.progress, ...action.payload.progress },
                settings: { ...initialState.settings, ...action.payload.settings },
                grammarProgress: action.payload.grammarProgress || {},
                kanjiExampleOverrides: action.payload.kanjiExampleOverrides || {},
                fastPassCards: action.payload.fastPassCards || {},
            };

        case 'SET_FAST_PASS': {
            const fastPassCards = { ...state.fastPassCards };
            for (const cardId of action.payload.cardIds) {
                fastPassCards[cardId] = action.payload.enabled;
            }
            return { ...state, fastPassCards };
        }

        case 'RATE_CARD': {
            const { cardId, cardType, rating } = action.payload;
            if (cardType === 'grammar') return state;

            let card = state.srsCards[cardId];

            if (!card) {
                card = createSRSCard(cardId, cardType as 'kanji' | 'vocabulary');
            }

            const updatedCard = calculateNextReview(card, rating);
            const isFirstSuccessfulReview = card.learnedAt === null && rating !== 'again';

            // Update streak
            const today = new Date().toISOString().split('T')[0];
            let { currentStreak, longestStreak, lastStudyDate } = state.progress;

            if (lastStudyDate !== today) {
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                if (lastStudyDate === yesterday) {
                    currentStreak += 1;
                } else {
                    currentStreak = 1;
                }
                lastStudyDate = today;
                longestStreak = Math.max(longestStreak, currentStreak);
            }

            return {
                ...state,
                srsCards: {
                    ...state.srsCards,
                    [cardId]: updatedCard,
                },
                progress: {
                    ...state.progress,
                    cardsLearned: state.progress.cardsLearned + (isFirstSuccessfulReview ? 1 : 0),
                    cardsReviewed: state.progress.cardsReviewed + (card.lastReview === null ? 0 : 1),
                    currentStreak,
                    longestStreak,
                    lastStudyDate,
                },
            };
        }

        case 'SAVE_MNEMONIC': {
            const { cardId, cardType, text } = action.payload;
            const now = Date.now();
            return {
                ...state,
                mnemonics: {
                    ...state.mnemonics,
                    [cardId]: {
                        cardId,
                        cardType,
                        text,
                        createdAt: state.mnemonics[cardId]?.createdAt || now,
                        updatedAt: now,
                    },
                },
            };
        }

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            };

        case 'UPDATE_PROGRESS':
            return {
                ...state,
                progress: { ...state.progress, ...action.payload },
            };

        case 'ADD_TO_REVIEW': {
            const { cardId, cardType } = action.payload;
            if (state.srsCards[cardId]) {
                // Already in review
                return state;
            }
            if (cardType === 'grammar') return state;
            const card = createSRSCard(cardId, cardType as 'kanji' | 'vocabulary');
            return {
                ...state,
                srsCards: {
                    ...state.srsCards,
                    [cardId]: card,
                },
            };
        }

        case 'REMOVE_FROM_REVIEW': {
            const { cardId } = action.payload;
            const updatedSRSCards = { ...state.srsCards };
            delete updatedSRSCards[cardId];
            return {
                ...state,
                srsCards: updatedSRSCards,
            };
        }

        case 'ADD_CUSTOM_CARD': {
            return {
                ...state,
                customCards: [action.payload.card, ...state.customCards],
            };
        }

        case 'DELETE_CUSTOM_CARD': {
            const { id } = action.payload;
            const fastPassCards = { ...state.fastPassCards };
            delete fastPassCards[id];
            const updatedSRSCards = { ...state.srsCards };
            delete updatedSRSCards[id];

            return {
                ...state,
                customCards: state.customCards.filter(c => c.id !== id),
                fastPassCards,
                srsCards: updatedSRSCards,
                mnemonics: Object.fromEntries(
                    Object.entries(state.mnemonics).filter(([cardId]) => cardId !== id)
                )
            };
        }

        case 'SET_KANJI_EXAMPLES': {
            const { kanjiId, examples } = action.payload;
            return {
                ...state,
                kanjiExampleOverrides: {
                    ...state.kanjiExampleOverrides,
                    [kanjiId]: examples,
                },
            };
        }

        case 'TOGGLE_GRAMMAR_STUDIED': {
            const { pointId } = action.payload;
            const updatedGrammarProgress = { ...state.grammarProgress };
            if (updatedGrammarProgress[pointId]) {
                delete updatedGrammarProgress[pointId];
            } else {
                updatedGrammarProgress[pointId] = true;
            }
            return {
                ...state,
                grammarProgress: updatedGrammarProgress,
            };
        }

        case 'RESET_PROGRESS':
            return {
                ...initialState,
                settings: state.settings, // Keep settings
            };

        default:
            return state;
    }
}

// Context types
interface StudyContextType {
    state: AppState;
    setFastPass: (cardIds: string[], enabled: boolean) => void;
    isFastPass: (cardId: string) => boolean;
    // Actions
    rateCard: (cardId: string, cardType: CardType, rating: SRSRating) => void;
    saveMnemonic: (cardId: string, cardType: CardType, text: string) => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    addToReview: (cardId: string, cardType: CardType) => void;
    removeFromReview: (cardId: string) => void;
    addCustomCard: (card: CustomCard) => void;
    deleteCustomCard: (id: string) => void;
    setKanjiExamples: (kanjiId: string, examples: KanjiExample[]) => void;
    toggleGrammarStudied: (pointId: string) => void;
    resetProgress: () => void;
    // Helpers
    getMnemonic: (cardId: string) => Mnemonic | null;
    getSRSCard: (cardId: string) => SRSCard | null;
    getDueCards: () => SRSCard[];
    getStats: () => ReturnType<typeof calculateStats>;
    getCardsByStatus: () => Record<CardStatus, SRSCard[]>;
    getNewKanji: (levels: JLPTLevel[], count: number) => typeof allKanji;
    getNewVocabulary: (levels: JLPTLevel[], count: number) => typeof allVocabulary;
}

const StudyContext = createContext<StudyContextType | null>(null);

// Provider component
export function StudyProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(studyReducer, initialState, () => loadState());

    // Save state on changes
    useEffect(() => {
        saveState(state);
    }, [state]);

    // Actions
    const rateCard = (cardId: string, cardType: CardType, rating: SRSRating) => {
        dispatch({ type: 'RATE_CARD', payload: { cardId, cardType, rating } });
    };

    const setFastPass = (cardIds: string[], enabled: boolean) => {
        dispatch({ type: 'SET_FAST_PASS', payload: { cardIds, enabled } });
    };

    const isFastPass = (cardId: string) => isFastPassCard(cardId, state.fastPassCards, state.customCards);

    const saveMnemonic = (cardId: string, cardType: CardType, text: string) => {
        dispatch({ type: 'SAVE_MNEMONIC', payload: { cardId, cardType, text } });
    };

    const updateSettings = (settings: Partial<AppSettings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    };

    const addToReview = (cardId: string, cardType: CardType) => {
        dispatch({ type: 'ADD_TO_REVIEW', payload: { cardId, cardType } });
    };

    const removeFromReview = (cardId: string) => {
        dispatch({ type: 'REMOVE_FROM_REVIEW', payload: { cardId } });
    };

    const addCustomCard = (card: CustomCard) => {
        dispatch({ type: 'ADD_CUSTOM_CARD', payload: { card } });
    };

    const deleteCustomCard = (id: string) => {
        dispatch({ type: 'DELETE_CUSTOM_CARD', payload: { id } });
    };

    const setKanjiExamples = (kanjiId: string, examples: KanjiExample[]) => {
        dispatch({ type: 'SET_KANJI_EXAMPLES', payload: { kanjiId, examples } });
    };

    const toggleGrammarStudied = (pointId: string) => {
        dispatch({ type: 'TOGGLE_GRAMMAR_STUDIED', payload: { pointId } });
    };

    const resetProgress = () => {
        dispatch({ type: 'RESET_PROGRESS' });
    };

    // Helpers
    const getMnemonic = (cardId: string): Mnemonic | null => {
        return state.mnemonics[cardId] || null;
    };

    const getSRSCard = (cardId: string): SRSCard | null => {
        return state.srsCards[cardId] || null;
    };

    const getDueCardsHelper = (): SRSCard[] => {
        return getDueCards(state.srsCards);
    };

    const getStats = () => {
        return calculateStats(state.srsCards);
    };

    const getCardsByStatus = (): Record<CardStatus, SRSCard[]> => {
        const grouped: Record<CardStatus, SRSCard[]> = {
            new: [],
            learning: [],
            review: [],
            mastered: [],
        };
        Object.values(state.srsCards).forEach(card => {
            grouped[getCardStatus(card)].push(card);
        });
        return grouped;
    };

    const getNewKanji = (levels: JLPTLevel[], count: number) => {
        const studied = new Set(Object.keys(state.srsCards));
        return allKanji
            .filter(k => levels.includes(k.jlptLevel) && !studied.has(k.id))
            .sort((a, b) => {
                // Same logic as BrowsePage: N5 first, then within level by frequency
                if (a.jlptLevel !== b.jlptLevel) {
                    return b.jlptLevel - a.jlptLevel;
                }
                return (a.frequency || 9999) - (b.frequency || 9999);
            })
            .slice(0, count);
    };

    const getNewVocabulary = (levels: JLPTLevel[], count: number) => {
        const studied = new Set(Object.keys(state.srsCards));
        return allVocabulary
            .filter(v => levels.includes(v.jlptLevel) && !studied.has(v.id))
            .sort((a, b) => {
                // Same logic as Kanji: N5 first
                return b.jlptLevel - a.jlptLevel;
            })
            .slice(0, count);
    };

    const value: StudyContextType = {
        state,
        setFastPass,
        isFastPass,
        rateCard,
        saveMnemonic,
        updateSettings,
        addToReview,
        removeFromReview,
        addCustomCard,
        deleteCustomCard,
        setKanjiExamples,
        toggleGrammarStudied,
        resetProgress,
        getMnemonic,
        getCardsByStatus,
        getSRSCard,
        getDueCards: getDueCardsHelper,
        getStats,
        getNewKanji,
        getNewVocabulary,
    };

    return (
        <StudyContext.Provider value={value}>
            {children}
        </StudyContext.Provider>
    );
}

// Hook to use the context
export function useStudy() {
    const context = useContext(StudyContext);
    if (!context) {
        throw new Error('useStudy must be used within a StudyProvider');
    }
    return context;
}
