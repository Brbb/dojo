// SM-2 based Spaced Repetition System Algorithm
import type { SRSCard, SRSRating } from '../types';

// Default ease factor for new cards
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

// Interval multipliers based on rating
const RATING_MULTIPLIERS: Record<SRSRating, number> = {
    again: 0,
    hard: 1.2,
    good: 1,
    easy: 1.3,
};

// Create a new SRS card entry
export function createSRSCard(cardId: string, cardType: 'kanji' | 'vocabulary'): SRSCard {
    return {
        cardId,
        cardType,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        dueDate: Date.now(),
        lastReview: null,
    };
}

// Calculate the next review based on SM-2 algorithm
export function calculateNextReview(card: SRSCard, rating: SRSRating): SRSCard {
    const now = Date.now();
    let { easeFactor, interval, repetitions } = card;

    // Quality score: again=0, hard=3, good=4, easy=5
    const qualityScores: Record<SRSRating, number> = {
        again: 0,
        hard: 3,
        good: 4,
        easy: 5,
    };
    const quality = qualityScores[rating];

    if (rating === 'again') {
        // Reset on failure
        repetitions = 0;
        interval = 1;
        // Ease Factor Reduction: SM-2 usually reduces EF even on fail
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
    } else {
        // Successful review
        repetitions += 1;

        if (repetitions === 1) {
            interval = 1; // 1 day
        } else if (repetitions === 2) {
            interval = 6; // 6 days
        } else {
            // Use a specific multiplier for Hard, otherwise use Ease Factor
            const multiplier = rating === 'hard' ? 1.2 : (easeFactor * RATING_MULTIPLIERS[rating]);
            interval = Math.ceil(interval * multiplier);
        }

        // Update ease factor using SM-2 formula
        easeFactor = Math.max(
            MIN_EASE_FACTOR,
            easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
    }

    // Calculate next due date
    const intervalMs = rating === 'again'
        ? 60 * 5 * 1000 // 5 minutes for 'again'
        : interval * 24 * 60 * 60 * 1000; // days to ms

    return {
        ...card,
        easeFactor,
        interval,
        repetitions,
        dueDate: now + intervalMs,
        lastReview: now,
    };
}

// Get cards that are due for review
export function getDueCards(cards: Record<string, SRSCard>): SRSCard[] {
    const now = Date.now();
    const dueCards = Object.values(cards)
        .filter(card => card.dueDate <= now)
        .sort((a, b) => a.dueDate - b.dueDate);
    console.log(dueCards);
    return dueCards;
}

// Get cards that are new (never reviewed)
export function getNewCards(cards: Record<string, SRSCard>): SRSCard[] {
    return Object.values(cards).filter(card => card.repetitions === 0);
}

// Get interval display string
export function getIntervalDisplay(card: SRSCard, rating: SRSRating): string {
    const nextCard = calculateNextReview({ ...card }, rating);
    const intervalDays = nextCard.interval;

    if (rating === 'again') {
        return '1m';
    } else if (intervalDays < 1) {
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
    if (card.repetitions === 0) return 'new';
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
        new: cardList.filter(c => c.repetitions === 0).length,
        learning: cardList.filter(c => c.repetitions > 0 && c.interval < 7).length,
        review: cardList.filter(c => c.interval >= 7 && c.interval < 30).length,
        mastered: cardList.filter(c => c.interval >= 30).length,
        dueNow: cardList.filter(c => c.dueDate <= now).length,
        dueToday: cardList.filter(c => {
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            return c.dueDate <= endOfDay.getTime();
        }).length,
    };
}
