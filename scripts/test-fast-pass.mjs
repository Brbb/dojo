import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

// Bundle the real TypeScript/data modules in memory; no browser/user storage is touched.
const bundle = await build({
    stdin: {
        contents: `export * from './src/utils/fastPass';
            export * from './src/utils/storage';
            export * from './src/utils/library';
            export { createSRSCard } from './src/utils/srs';
            export { allVocabulary } from './src/data/vocabulary';
            export { allKanji } from './src/data/kanji';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
});
const app = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const saved = new Map();
globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
};
const batches = ['book-0019-0036', 'book-0037-0072', 'book-0073-0203', 'book-0204-0227', 'book-0228-0331', 'book-0308', 'book-index-defined', 'book-index-na', 'book-index-manual'].map(name =>
    JSON.parse(readFileSync(`src/data/fastPass/${name}.json`, 'utf8')));
const indexExisting = JSON.parse(readFileSync('src/data/fastPass/book-index-existing.json', 'utf8')).entries;
const indexAliases = JSON.parse(readFileSync('src/data/fastPass/book-index-library-aliases.json', 'utf8')).entries;
const normalize = value => value.normalize('NFKC')
    .replace(/[〜～~]/g, '~')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
const matches = (entry, card) => entry.match_forms.some(form => normalize(form) === normalize(card.word))
    && [entry.reading, ...(entry.reading_variants || []), ...(entry.suru ? [`${entry.reading}する`] : [])]
        .some(reading => normalize(reading) === normalize(card.reading));

const state = app.loadState();
const priorBookCards = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 6));
assert.equal(priorBookCards.length, 101); // Earlier photographed batches.
const newCustomCardCount = state.customCards.length - priorBookCards.length;
assert.ok(newCustomCardCount > 0 && newCustomCardCount <= 150);
assert.deepEqual(state.fastPassImports, app.FAST_PASS_BOOK_IMPORTS);
assert.deepEqual(app.mergeFastPassBookCards(state.customCards), state.customCards);
assert.equal(indexExisting.length, 415);
assert.equal(indexAliases.length, 39);
assert.equal(new Set(indexExisting.map(entry => `${entry.term}:${entry.reading}`)).size, indexExisting.length);
for (const entry of indexExisting) {
    assert.ok(entry.page >= 14 && entry.page <= 258 && entry.page % 2 === 0, `Invalid page for ${entry.term}`);
    const cards = app.allVocabulary.filter(card => normalize(card.word) === normalize(entry.term)
        && normalize(card.reading) === normalize(entry.reading));
    assert.ok(cards.length, `Index entry missing from library: ${entry.term}`);
    assert.ok(cards.every(card => app.isFastPassCard(card.id, {}, state.customCards)), `Index entry not tagged: ${entry.term}`);
}
for (const entry of indexAliases) {
    const cards = app.allVocabulary.filter(card => normalize(card.word) === normalize(entry.term)
        && normalize(card.reading) === normalize(entry.reading));
    assert.ok(cards.length, `Library alias missing: ${entry.term}`);
    assert.ok(cards.every(card => app.isFastPassCard(card.id, {}, state.customCards)), `Library alias not tagged: ${entry.term}`);
}
assert.equal(new Set(state.customCards.map(card => card.id)).size, state.customCards.length);
const suffix = state.customCards.filter(card => card.word === '～代');
assert.equal(suffix.length, 1);
assert.equal(suffix[0].meaning.length, 2);
for (const entry of batches.flatMap(batch => batch.entries)) {
    const cards = [...app.allVocabulary, ...state.customCards].filter(card => matches(entry, card));
    assert.ok(cards.length, `Missing ${entry.number}: ${entry.term}`);
    assert.ok(cards.every(card => app.isFastPassCard(card.id, {}, state.customCards)), `Untagged ${entry.term}`);
}
assert.ok(app.isDefaultFastPass('vocabulary', '人工的', 'じんこうてき'));
assert.ok(app.isDefaultFastPass('vocabulary', '一般的', 'いっぱんてき'));
assert.ok(app.isDefaultFastPass('vocabulary', '申請する', 'しんせいする'));
assert.equal(app.isDefaultFastPass('vocabulary', '代', 'よ'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '年', 'ねん'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '愛', 'あい'), false);
assert.equal(app.isDefaultFastPass('kanji', '政'), false);
assert.equal(app.isDefaultFastPass('kanji', '民'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '家具', 'かぐ'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '家', 'いえ'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '具', 'ぐ'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '番組', 'ばんぐみ'), true);
assert.equal(app.isDefaultFastPass('kanji', '番'), false);
assert.equal(app.isDefaultFastPass('vocabulary', '確実', 'かくじつ'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '確実な', 'かくじつな'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '基本的な', 'きほんてきな'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '持ち帰る', 'もちかえる'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '閉館', 'へいかん'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '閉館する', 'へいかんする'), true);
assert.equal(app.isDefaultFastPass('vocabulary', '持つ', 'もつ'), false);
assert.equal(app.isDefaultFastPass('kanji', '持'), false);
assert.equal(batches.flatMap(batch => batch.entries).filter(entry => entry.number === '0308').length, 1);
const confirmation = app.allVocabulary.find(card => card.word === '確認' && card.reading === 'かくにん');
assert.ok(confirmation);
assert.ok(app.isFastPassCard(confirmation.id, {}, state.customCards));
assert.ok(!state.customCards.some(card => card.word === '確認' || card.word === '確認する'));
const peel = app.allVocabulary.find(card => card.word === '剥く' && card.reading === 'むく');
assert.ok(peel && app.isFastPassCard(peel.id, {}, state.customCards));
assert.ok(!state.customCards.some(card => card.word === 'むく' || card.word === '剥く'));
const certain = state.customCards.find(card => card.word === 'ある～' && card.reading === 'ある～');
assert.ok(certain && certain.meaning[0].includes('a certain'));
for (const reused of ['真面目な', '無駄な', 'ひびく', 'ふるさと', 'どなる']) {
    assert.ok(!state.customCards.some(card => card.word === reused), `Duplicate custom card for ${reused}`);
}
for (const entry of batches.flatMap(batch => batch.entries).filter(entry => entry.suru)) {
    assert.ok(app.isDefaultFastPass('vocabulary', entry.term, entry.reading));
    assert.ok(app.isDefaultFastPass('vocabulary', `${entry.term}する`, `${entry.reading}する`));
    const libraryMatch = app.allVocabulary.some(card => matches(entry, card));
    if (libraryMatch) {
        assert.ok(!state.customCards.some(card => card.id === `custom_fast-pass-book-${entry.number}`),
            `Duplicate custom card for existing （する） entry ${entry.number}: ${entry.term}`);
    }
}
// Even a single-character word is tagged as vocabulary, not as a kanji card.
assert.equal(app.isDefaultFastPass('vocabulary', '横', 'よこ'), true);
assert.equal(app.isDefaultFastPass('kanji', '横'), false);
const house = app.allKanji.find(card => card.character === '家');
assert.ok(house);
assert.ok(app.allKanji.every(card => !app.isFastPassCard(card.id, {}, state.customCards)));
assert.equal(app.isFastPassCard(house.id, { [house.id]: true }, state.customCards), true);
assert.equal(app.isFastPassCard(house.id, { [house.id]: false }, state.customCards), false);
const customKanji = { id: 'custom-house', type: 'kanji', word: '家', reading: 'いえ', meaning: ['house'] };
assert.equal(app.isFastPassCard(customKanji.id, {}, [customKanji]), false);
assert.equal(app.isFastPassCard(customKanji.id, { [customKanji.id]: true }, [customKanji]), true);
for (const cards of [app.allVocabulary, app.allKanji]) {
    for (const level of [5, 4, 3, 2, 1]) {
        const levelCards = cards.filter(card => card.jlptLevel === level);
        if (!levelCards.length) continue;
        const selected = app.filterLibraryItems(levelCards, level, true, id => app.isFastPassCard(id, {}, state.customCards));
        assert.ok(selected.length < levelCards.length, `N${level} must not be entirely Fast Pass`);
        assert.deepEqual(app.filterLibraryItems(levelCards, level, false, () => true), levelCards);
    }
}

const existing = app.allVocabulary.find(card => card.word === '申し訳ない');
assert.equal(existing.jlptLevel, 2);
assert.equal(app.isFastPassCard(existing.id, { [existing.id]: false }, state.customCards), false);
const manual = { id: 'manual', type: 'vocabulary', word: '手動', reading: 'しゅどう', meaning: ['manual'], jlptLevel: 5 };
assert.equal(app.isFastPassCard(manual.id, { manual: true }, [manual]), true);
const items = [...app.allVocabulary, ...state.customCards, manual];
const membership = id => app.isFastPassCard(id, { manual: true }, [...state.customCards, manual]);
const all = app.filterLibraryItems(items, 'all', true, membership);
assert.ok(all.some(card => card.jlptLevel === 2));
assert.ok(all.some(card => card.id === manual.id));
assert.ok(all.some(card => card.id === 'custom_fast-pass-book-0067'));
assert.ok(all.every(card => membership(card.id)));
const n3 = app.filterLibraryItems(items, 3, true, membership);
assert.ok(n3.length > 0 && n3.every(card => card.jlptLevel === 3 && membership(card.id)));
assert.ok(!n3.some(card => card.id === existing.id));
assert.equal(app.filterLibraryItems(app.allKanji, 'all', true, membership).length, 0);
assert.deepEqual(app.filterLibraryItems(app.allKanji, 'all', true,
    id => app.isFastPassCard(id, { [house.id]: true }, state.customCards)), [house]);

// Upgrade only the pending batch; never resurrect a deleted earlier custom card.
const oldCards = app.mergeFastPassBookCards([], ['book-0019-0036-v1']);
const old = {
    ...state, fastPassImports: ['book-0019-0036-v1'],
    customCards: oldCards.filter(card => card.id !== 'custom_fast-pass-book-0021'),
    fastPassCards: { [existing.id]: false, [house.id]: true },
    srsCards: { [existing.id]: { ...app.createSRSCard(existing.id, 'vocabulary'), dueDate: 1800000000000 } },
};
app.saveState(old);
const upgraded = app.loadState();
assert.equal(upgraded.customCards.length, 100 + newCustomCardCount);
assert.ok(!upgraded.customCards.some(card => card.id === 'custom_fast-pass-book-0021'));
assert.deepEqual(upgraded.srsCards, old.srsCards);
assert.deepEqual(upgraded.fastPassCards, old.fastPassCards);
app.saveState({ ...upgraded, customCards: upgraded.customCards.filter(card => card.id !== 'custom_fast-pass-book-0067') });
assert.ok(!app.loadState().customCards.some(card => card.id === 'custom_fast-pass-book-0067'));

// An installation with all three earlier batches gets only the new seven cards.
const priorThree = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 3));
app.saveState({ ...old, fastPassImports: app.FAST_PASS_BOOK_IMPORTS.slice(0, 3),
    customCards: priorThree.filter(card => card.id !== 'custom_fast-pass-book-0202') });
const fourthBatch = app.loadState();
assert.equal(fourthBatch.customCards.length, 100 + newCustomCardCount);
assert.ok(!fourthBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0202'));
assert.ok(fourthBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0226'));
assert.deepEqual(fourthBatch.srsCards, old.srsCards);
assert.deepEqual(fourthBatch.fastPassCards, old.fastPassCards);
app.saveState({ ...fourthBatch, customCards: fourthBatch.customCards.filter(card => card.id !== 'custom_fast-pass-book-0226') });
assert.ok(!app.loadState().customCards.some(card => card.id === 'custom_fast-pass-book-0226'));

// A user already on both earlier imports receives only the third batch.
const priorCards = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 2));
app.saveState({ ...old, fastPassImports: app.FAST_PASS_BOOK_IMPORTS.slice(0, 2),
    customCards: priorCards.filter(card => card.id !== 'custom_fast-pass-book-0067') });
const thirdBatch = app.loadState();
assert.equal(thirdBatch.customCards.length, 100 + newCustomCardCount);
assert.ok(!thirdBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0067'));
assert.ok(thirdBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0202'));
assert.deepEqual(thirdBatch.srsCards, old.srsCards);

// An installation with the first four batches receives the later 30-card batch and 0308.
const priorFour = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 4));
app.saveState({ ...old, fastPassImports: app.FAST_PASS_BOOK_IMPORTS.slice(0, 4),
    customCards: priorFour.filter(card => card.id !== 'custom_fast-pass-book-0226') });
const fifthBatch = app.loadState();
assert.equal(fifthBatch.customCards.length, 100 + newCustomCardCount);
assert.ok(!fifthBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0226'));
assert.ok(fifthBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0331'));
assert.deepEqual(fifthBatch.srsCards, old.srsCards);
assert.deepEqual(fifthBatch.fastPassCards, old.fastPassCards);
app.saveState({ ...fifthBatch, customCards: fifthBatch.customCards.filter(card => card.id !== 'custom_fast-pass-book-0331') });
assert.ok(!app.loadState().customCards.some(card => card.id === 'custom_fast-pass-book-0331'));

// An installation that already imported 0228–0331 receives only the new 0308 card.
const priorFive = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 5));
app.saveState({ ...old, fastPassImports: app.FAST_PASS_BOOK_IMPORTS.slice(0, 5),
    customCards: priorFive.filter(card => card.id !== 'custom_fast-pass-book-0226') });
const supplemental = app.loadState();
assert.equal(supplemental.customCards.length, 100 + newCustomCardCount);
assert.ok(supplemental.customCards.some(card => card.id === 'custom_fast-pass-book-0308'));
assert.ok(!supplemental.customCards.some(card => card.id === 'custom_fast-pass-book-0226'));
assert.deepEqual(supplemental.srsCards, old.srsCards);
assert.deepEqual(supplemental.fastPassCards, old.fastPassCards);

// Respect a pre-existing user's alias card, definition, ID, and JLPT level.
const custom = { id: 'user-own-card', type: 'vocabulary', word: '人工的', reading: 'じんこうてき', meaning: ['my definition'], jlptLevel: 2 };
const merged = app.mergeFastPassBookCards([custom], ['book-0037-0072-v1']);
assert.equal(merged.filter(card => ['人工的', '人工的な'].includes(card.word)).length, 1);
assert.deepEqual(merged.find(card => card.id === custom.id), custom);
assert.ok(app.isFastPassCard(custom.id, {}, merged));
assert.equal(app.importData(JSON.stringify(old)), true);
assert.deepEqual(app.loadState().srsCards, old.srsCards);
console.log(`Fast Pass: ${batches.flatMap(batch => batch.entries).length + indexExisting.length + indexAliases.length} photographed source entries covered; ${newCustomCardCount} new custom cards, word-only defaults, no component-kanji tags, manual overrides, safe imports, and unchanged review schedules passed.`);
