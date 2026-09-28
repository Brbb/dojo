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
const batches = ['book-0019-0036', 'book-0037-0072', 'book-0073-0203'].map(name =>
    JSON.parse(readFileSync(`src/data/fastPass/${name}.json`, 'utf8')));
const normalize = value => value.normalize('NFKC')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
const matches = (entry, card) => entry.match_forms.some(form => normalize(form) === normalize(card.word))
    && [entry.reading, ...(entry.reading_variants || []), ...(entry.suru ? [`${entry.reading}する`] : [])]
        .some(reading => normalize(reading) === normalize(card.reading));

const state = app.loadState();
assert.equal(state.customCards.length, 63); // 7 + 14 + 42 missing book words.
assert.deepEqual(state.fastPassImports, app.FAST_PASS_BOOK_IMPORTS);
assert.deepEqual(app.mergeFastPassBookCards(state.customCards), state.customCards);
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
assert.ok(app.filterLibraryItems(app.allKanji, 'all', true, membership).length > 0);

// Upgrade only the pending batch; never resurrect a deleted earlier custom card.
const oldCards = app.mergeFastPassBookCards([], ['book-0019-0036-v1']);
const old = {
    ...state, fastPassImports: ['book-0019-0036-v1'],
    customCards: oldCards.filter(card => card.id !== 'custom_fast-pass-book-0021'),
    fastPassCards: { [existing.id]: false },
    srsCards: { [existing.id]: { ...app.createSRSCard(existing.id, 'vocabulary'), dueDate: 1800000000000 } },
};
app.saveState(old);
const upgraded = app.loadState();
assert.equal(upgraded.customCards.length, 62);
assert.ok(!upgraded.customCards.some(card => card.id === 'custom_fast-pass-book-0021'));
assert.deepEqual(upgraded.srsCards, old.srsCards);
assert.deepEqual(upgraded.fastPassCards, old.fastPassCards);
app.saveState({ ...upgraded, customCards: upgraded.customCards.filter(card => card.id !== 'custom_fast-pass-book-0067') });
assert.ok(!app.loadState().customCards.some(card => card.id === 'custom_fast-pass-book-0067'));

// A user already on both earlier imports receives only the third batch.
const priorCards = app.mergeFastPassBookCards([], app.FAST_PASS_BOOK_IMPORTS.slice(0, 2));
app.saveState({ ...old, fastPassImports: app.FAST_PASS_BOOK_IMPORTS.slice(0, 2),
    customCards: priorCards.filter(card => card.id !== 'custom_fast-pass-book-0067') });
const thirdBatch = app.loadState();
assert.equal(thirdBatch.customCards.length, 62);
assert.ok(!thirdBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0067'));
assert.ok(thirdBatch.customCards.some(card => card.id === 'custom_fast-pass-book-0202'));
assert.deepEqual(thirdBatch.srsCards, old.srsCards);

// Respect a pre-existing user's alias card, definition, ID, and JLPT level.
const custom = { id: 'user-own-card', type: 'vocabulary', word: '人工的', reading: 'じんこうてき', meaning: ['my definition'], jlptLevel: 2 };
const merged = app.mergeFastPassBookCards([custom], ['book-0037-0072-v1']);
assert.equal(merged.filter(card => ['人工的', '人工的な'].includes(card.word)).length, 1);
assert.deepEqual(merged.find(card => card.id === custom.id), custom);
assert.ok(app.isFastPassCard(custom.id, {}, merged));
assert.equal(app.importData(JSON.stringify(old)), true);
assert.deepEqual(app.loadState().srsCards, old.srsCards);
console.log('Fast Pass: 185 source entries covered; imports, aliases, overrides, JLPT intersections, untagged cards at every level, deletion safety, and backup migration passed.');
