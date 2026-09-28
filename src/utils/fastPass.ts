import fastPassN3 from '../data/fastPass/n3.json';
import fastPassBook from '../data/fastPass/book-0019-0036.json';
import fastPassBookNext from '../data/fastPass/book-0037-0072.json';
import fastPassBookMore from '../data/fastPass/book-0073-0203.json';
import { allVocabulary } from '../data/vocabulary';
import type { CardType, CustomCard } from '../types';

const normalize = (value: string) => value.normalize('NFKC').trim();
const normalizeReading = (value: string) => normalize(value)
    .replace(/[()（）.・\s]/g, '')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));

const vocabularyForms = new Map<string, Set<string>>();

interface BookEntry {
    number: string;
    term: string;
    reading: string;
    reading_variants?: string[];
    meaning: string[];
    suru: boolean;
    match_forms: string[];
}

const bookImports: { id: string; entries: BookEntry[] }[] = [
    { id: 'book-0019-0036-v1', entries: fastPassBook.entries },
    { id: 'book-0037-0072-v1', entries: fastPassBookNext.entries },
    { id: 'book-0073-0203-v1', entries: fastPassBookMore.entries },
];
export const FAST_PASS_BOOK_IMPORTS = bookImports.map(batch => batch.id);

function bookReadings(entry: BookEntry): string[] {
    return [entry.reading, ...(entry.reading_variants || []), ...(entry.suru ? [`${entry.reading}する`] : [])];
}

function registerVocabulary(forms: string[], readings: string[]) {
    for (const form of new Set(forms)) {
        const key = normalize(form);
        const existing = vocabularyForms.get(key) || new Set<string>();
        for (const reading of readings) existing.add(normalizeReading(reading));
        vocabularyForms.set(key, existing);
    }
}

// Kanji questions also contain vocabulary terms, such as 割る and 基本.
for (const entry of [...fastPassN3.kanji, ...fastPassN3.vocab]) {
    registerVocabulary([entry.term, ...entry.match_forms], [entry.reading]);
}

for (const entry of bookImports.flatMap(batch => batch.entries)) {
    registerVocabulary(entry.match_forms, bookReadings(entry));
}

// Keep existing library and user cards; create only the missing book words.
export function mergeFastPassBookCards(customCards: CustomCard[], pendingImports = FAST_PASS_BOOK_IMPORTS): CustomCard[] {
    const result = [...customCards];
    for (const entry of bookImports.filter(batch => pendingImports.includes(batch.id)).flatMap(batch => batch.entries)) {
        const matches = (word: string, reading?: string) => {
            if (!entry.match_forms.some(form => normalize(form) === normalize(word))) return false;
            if (!reading?.trim()) return true;
            const expected = bookReadings(entry);
            return expected.some(value => normalizeReading(value) === normalizeReading(reading));
        };
        if (allVocabulary.some(card => matches(card.word, card.reading))) continue;
        if (result.some(card => card.type === 'vocabulary' && matches(card.word, card.reading))) continue;

        const id = `custom_fast-pass-book-${entry.number}`;
        if (result.some(card => card.id === id)) continue;
        result.push({
            id,
            type: 'vocabulary',
            word: entry.term,
            reading: entry.reading,
            meaning: [...entry.meaning],
            jlptLevel: 3,
            createdAt: Date.now(),
        });
    }
    return result;
}

export function isDefaultFastPass(type: CardType, word: string, reading?: string): boolean {
    // These are word lists, even when a word comes from a kanji-reading question.
    // Never infer membership for standalone kanji from a word's components.
    if (type !== 'vocabulary') return false;
    const readings = vocabularyForms.get(normalize(word));
    if (!readings) return false;
    // Match the spelling/explicit aliases and reading rather than every homophone.
    return !reading?.trim() || readings.has(normalizeReading(reading));
}

const defaultCardIds = new Set([
    ...allVocabulary.filter(card => isDefaultFastPass('vocabulary', card.word, card.reading)).map(card => card.id),
]);

export function isFastPassCard(
    cardId: string,
    overrides: Record<string, boolean>,
    customCards: CustomCard[],
): boolean {
    if (Object.prototype.hasOwnProperty.call(overrides, cardId)) return overrides[cardId];
    if (defaultCardIds.has(cardId)) return true;
    const custom = customCards.find(card => card.id === cardId);
    return !!custom && isDefaultFastPass(custom.type, custom.word, custom.reading);
}
