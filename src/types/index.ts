// Type definitions for the Japanese flashcard app

export type JLPTLevel = 5 | 4 | 3 | 2 | 1;

export interface KanjiExample {
    word: string;
    reading: string;
    meaning: string;
}

export interface Kanji {
    id: string;
    character: string;
    onyomi: string[];
    kunyomi: string[];
    meaning: string[];
    jlptLevel: JLPTLevel;
    examples?: KanjiExample[];
}

export interface VocabularyExample {
    sentence: string;
    translation: string;
}

export interface Vocabulary {
    id: string;
    word: string;
    reading: string;
    meaning: string[];
    jlptLevel: JLPTLevel;
    partOfSpeech: string;
    examples?: VocabularyExample[];
}

export type CardType = 'kanji' | 'vocabulary' | 'grammar';

export interface Card {
    type: CardType;
    data: Kanji | Vocabulary;
}

// SRS (Spaced Repetition System) Types
export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSCard {
    cardId: string;
    cardType: CardType;
    easeFactor: number;       // Starts at 2.5
    interval: number;         // Days until next review
    repetitions: number;      // Number of successful reviews
    dueDate: number;          // Unix timestamp
    lastReview: number | null; // Unix timestamp
}

export interface UserProgress {
    cardsLearned: number;
    cardsReviewed: number;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string | null; // ISO date string
    totalStudyTime: number;       // Minutes
}

export interface StudySession {
    id: string;
    startTime: number;
    endTime: number | null;
    mode: CardType | 'mixed';
    levels: JLPTLevel[];
    cardsStudied: number;
    ratings: Record<SRSRating, number>;
}

export interface Mnemonic {
    cardId: string;
    cardType: CardType;
    text: string;
    createdAt: number;
    updatedAt: number;
}

export interface AppSettings {
    theme: 'dark' | 'light' | 'system';
    dailyNewCards: number;
    dailyReviewLimit: number;
    showReadingsFirst: boolean;
    autoFlipDelay: number | null; // null = disabled
    selectedLevels: JLPTLevel[];
}

export interface AppState {
    srsCards: Record<string, SRSCard>;
    mnemonics: Record<string, Mnemonic>;
    grammarProgress: Record<string, boolean>; // topicId_pointId -> studied
    progress: UserProgress;
    settings: AppSettings;
    sessions: StudySession[];
}
