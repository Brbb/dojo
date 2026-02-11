// Kanji data index - exports all JLPT levels
import type { Kanji } from '../../types';
import { n5Kanji } from './n5';
import { n4Kanji } from './n4';
import { n3Kanji } from './n3';

// Combined kanji from all levels
export const allKanji: Kanji[] = [
    ...n5Kanji,
    ...n4Kanji,
    ...n3Kanji,
    // Additional levels will be added here as they are created
];

// Get kanji by JLPT level
export function getKanjiByLevel(level: 5 | 4 | 3 | 2 | 1): Kanji[] {
    return allKanji.filter(k => k.jlptLevel === level);
}

// Get random kanji from specified levels
export function getRandomKanji(levels: (5 | 4 | 3 | 2 | 1)[], count: number): Kanji[] {
    const filtered = allKanji.filter(k => levels.includes(k.jlptLevel));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Search kanji by character, meaning, or reading
export function searchKanji(query: string): Kanji[] {
    const q = query.toLowerCase();
    return allKanji.filter(k =>
        k.character.includes(query) ||
        k.meaning.some(m => m.toLowerCase().includes(q)) ||
        k.onyomi.some(r => r.includes(query)) ||
        k.kunyomi.some(r => r.includes(query))
    );
}

// Export individual level data
export { n5Kanji, n3Kanji };

// Stats
export const kanjiStats = {
    n5: n5Kanji.length,
    n4: n4Kanji.length,
    n3: n3Kanji.length,
    total: n5Kanji.length + n4Kanji.length + n3Kanji.length
};
