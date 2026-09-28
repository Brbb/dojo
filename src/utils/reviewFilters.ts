import type { CardType, JLPTLevel } from '../types';

interface ReviewFilters {
    kanji: boolean;
    vocabulary: boolean;
    fastPassOnly: boolean;
    levels: JLPTLevel[];
}

// Applied to due cards only; choosing a study set never changes scheduling.
export function matchesReviewFilters(
    cardType: CardType,
    level: JLPTLevel,
    fastPass: boolean,
    filters: ReviewFilters,
): boolean {
    if (!filters.levels.includes(level)) return false;
    if (filters.fastPassOnly && !fastPass) return false;
    if (cardType === 'kanji') return filters.kanji;
    if (cardType === 'vocabulary') return filters.vocabulary;
    return false;
}
