import type { JLPTLevel, Kanji, Vocabulary } from '../types';

// Fast Pass is an independent collection, not a replacement JLPT level.
export function filterLibraryItems<T extends Kanji | Vocabulary>(
    items: T[],
    level: JLPTLevel | 'all',
    fastPassOnly: boolean,
    isFastPass: (id: string) => boolean,
): T[] {
    return items.filter(item => (level === 'all' || item.jlptLevel === level)
        && (!fastPassOnly || isFastPass(item.id)));
}
