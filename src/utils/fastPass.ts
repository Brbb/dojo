import fastPassN3 from '../data/fastPass/n3.json';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import type { CardType, CustomCard } from '../types';

const normalize = (value: string) => value.normalize('NFKC').trim();
const normalizeReading = (value: string) => normalize(value)
    .replace(/[()（）.・\s]/g, '')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));

const kanjiCharacters = new Set(fastPassN3.kanji.flatMap(entry => entry.characters).map(normalize));
const vocabularyForms = new Map<string, Set<string>>();

// Kanji questions also contain vocabulary terms, such as 割る and 基本.
for (const entry of [...fastPassN3.kanji, ...fastPassN3.vocab]) {
    for (const form of new Set([entry.term, ...entry.match_forms])) {
        const key = normalize(form);
        const readings = vocabularyForms.get(key) || new Set<string>();
        readings.add(normalizeReading(entry.reading));
        vocabularyForms.set(key, readings);
    }
}

export function isDefaultFastPass(type: CardType, word: string, reading?: string): boolean {
    if (type === 'kanji') return kanjiCharacters.has(normalize(word));
    if (type !== 'vocabulary') return false;
    const readings = vocabularyForms.get(normalize(word));
    if (!readings) return false;
    // Match the spelling/explicit aliases and reading rather than every homophone.
    return !reading?.trim() || readings.has(normalizeReading(reading));
}

const defaultCardIds = new Set([
    ...allKanji.filter(card => isDefaultFastPass('kanji', card.character)).map(card => card.id),
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
