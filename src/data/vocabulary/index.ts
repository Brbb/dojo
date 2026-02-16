// Vocabulary data index - exports all JLPT levels
import type { Vocabulary } from '../../types';
import { n3Vocabulary } from './n3';
import { n4Vocabulary } from './n4';
import { n5Vocabulary } from './n5';

// Combined vocabulary from all levels
export const allVocabulary: Vocabulary[] = [
    ...n3Vocabulary,
    ...n4Vocabulary,
    ...n5Vocabulary,
];

// Get vocabulary by JLPT level
export function getVocabularyByLevel(level: 5 | 4 | 3 | 2 | 1): Vocabulary[] {
    return allVocabulary.filter(v => v.jlptLevel === level);
}

// Get random vocabulary from specified levels
export function getRandomVocabulary(levels: (5 | 4 | 3 | 2 | 1)[], count: number): Vocabulary[] {
    const filtered = allVocabulary.filter(v => levels.includes(v.jlptLevel));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Search vocabulary by word, meaning, or reading
export function searchVocabulary(query: string): Vocabulary[] {
    const q = query.toLowerCase();
    return allVocabulary.filter(v =>
        v.word.includes(query) ||
        v.reading.includes(query) ||
        v.meaning.some(m => m.toLowerCase().includes(q))
    );
}

// Export individual level data
export { n5Vocabulary, n4Vocabulary, n3Vocabulary };

// Stats
export const vocabularyStats = {
    n5: n5Vocabulary.length,
    n4: n4Vocabulary.length,
    n3: n3Vocabulary.length,
    total: allVocabulary.length,
};
