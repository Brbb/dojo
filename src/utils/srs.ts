// Day-based SRS tuned for simple, predictable backlog handling.
import type { SRSCard, SRSRating } from '../types';

const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_STABILITY = 1;
const DEFAULT_DIFFICULTY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundToTenth = (value: number) => Math.round(value * 10) / 10;

export function getNextReviewLabel(dueDate: number, now = Date.now()): string {
    const remainingMs = dueDate - now;
    if (remainingMs <= 0) return 'Due now';

    const minutes = Math.ceil(remainingMs / (60 * 1000));
    if (minutes < 60) return `In ${minutes} min`;

    const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
    if (hours < 24) return `In ${hours} hr`;

    const days = Math.ceil(remainingMs / DAY_MS);
    return `In ${days} day${days === 1 ? '' : 's'}`;
}

export function getNextReviewShortLabel(dueDate: number, now = Date.now()): string {
    const remainingMs = dueDate - now;
    if (remainingMs <= 0) return 'Due';

    const minutes = Math.ceil(remainingMs / (60 * 1000));
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h`;

    return `${Math.ceil(remainingMs / DAY_MS)}d`;
}

export function getNextReviewDate(dueDate: number): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(dueDate));
}

// Create a new SRS card entry
export function createSRSCard(cardId: string, cardType: 'kanji' | 'vocabulary'): SRSCard {
    return {
        cardId,
        cardType,
        stability: DEFAULT_STABILITY,
        difficulty: DEFAULT_DIFFICULTY,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        dueDate: Date.now(),
        lastReview: null,
        learnedAt: null,
    };
}

// Add v2 fields to a legacy card without changing its existing schedule.
export function migrateSRSCard(card: SRSCard): SRSCard {
    const hasLearnedAt = Object.prototype.hasOwnProperty.call(card, 'learnedAt');
    const legacyEase = Number.isFinite(card.easeFactor) ? card.easeFactor : DEFAULT_EASE_FACTOR;
    const stability = Number.isFinite(card.stability) && card.stability > 0
        ? card.stability
        : Math.max(DEFAULT_STABILITY, card.interval || 0);
    const difficulty = Number.isFinite(card.difficulty)
        ? clamp(card.difficulty, 1, 10)
        : clamp(5 + (DEFAULT_EASE_FACTOR - legacyEase) * 3.75, 1, 10);

    return {
        ...card,
        stability: roundToTenth(stability),
        difficulty: roundToTenth(difficulty),
        easeFactor: legacyEase,
        repetitions: Number.isFinite(card.repetitions) ? card.repetitions : 0,
        // Legacy cards have no learnedAt field. Existing v2 cards may deliberately
        // keep it null after one or more Again ratings.
        learnedAt: hasLearnedAt ? (card.learnedAt ?? null) : card.lastReview,
    };
}

export function calculateNextReview(card: SRSCard, rating: SRSRating): SRSCard {
    const now = Date.now();
    const migratedCard = migrateSRSCard(card);
    let { stability, difficulty, repetitions } = migratedCard;
    let interval: number;

    if (rating === 'again') {
        difficulty = Math.min(10, difficulty + 2);
        stability = 1;
        interval = 1;
        repetitions = 0;
    } else if (rating === 'almost') {
        difficulty = Math.min(10, difficulty + 0.5);
        const growthFactor = Math.max(1.3, 1.8 - difficulty * 0.05);
        stability *= growthFactor;
        interval = Math.max(2, stability);
        repetitions += 1;
    } else {
        difficulty = Math.max(1, difficulty - 1);
        const growthFactor = Math.max(2, 3.5 - difficulty * 0.15);
        stability *= growthFactor;
        interval = Math.max(3, stability);
        repetitions += 1;
    }

    stability = roundToTenth(stability);
    difficulty = roundToTenth(difficulty);
    interval = roundToTenth(interval);

    return {
        ...migratedCard,
        stability,
        difficulty,
        interval,
        repetitions,
        dueDate: now + interval * DAY_MS,
        lastReview: now,
        learnedAt: migratedCard.learnedAt ?? (rating === 'again' ? null : now),
    };
}

// Get cards that are due for review
export function getDueCards(cards: Record<string, SRSCard>): SRSCard[] {
    const now = Date.now();
    const dueCards = Object.values(cards)
        .filter(card => card.dueDate <= now)
        .sort((a, b) => a.dueDate - b.dueDate);
    return dueCards;
}

// Get cards that are new (never reviewed)
export function getNewCards(cards: Record<string, SRSCard>): SRSCard[] {
    return Object.values(cards).filter(card => card.lastReview === null);
}

// Get interval display string
export function getIntervalDisplay(card: SRSCard, rating: SRSRating): string {
    const nextCard = calculateNextReview({ ...card }, rating);
    const intervalDays = nextCard.interval;

    if (intervalDays < 1) {
        return '<1d';
    } else if (intervalDays === 1) {
        return '1d';
    } else if (intervalDays < 30) {
        return `${intervalDays}d`;
    } else if (intervalDays < 365) {
        const months = Math.round(intervalDays / 30);
        return `${months}mo`;
    } else {
        const years = Math.round(intervalDays / 365);
        return `${years}y`;
    }
}

// Get card status
export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';

export function getCardStatus(card: SRSCard): CardStatus {
    if (card.lastReview === null) return 'new';
    if (card.interval < 7) return 'learning';
    if (card.interval < 30) return 'review';
    return 'mastered';
}

// Statistics helpers
export function calculateStats(cards: Record<string, SRSCard>) {
    const cardList = Object.values(cards);
    const now = Date.now();

    return {
        total: cardList.length,
        new: cardList.filter(c => getCardStatus(c) === 'new').length,
        learning: cardList.filter(c => getCardStatus(c) === 'learning').length,
        review: cardList.filter(c => getCardStatus(c) === 'review').length,
        mastered: cardList.filter(c => getCardStatus(c) === 'mastered').length,
        dueNow: cardList.filter(c => c.dueDate <= now).length,
        dueToday: cardList.filter(c => {
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            return c.dueDate <= endOfDay.getTime();
        }).length,
    };
}
