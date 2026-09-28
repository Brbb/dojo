import { Fragment, useMemo, useState, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import type { Kanji, Vocabulary, CardType, Mnemonic, KanjiExample } from '../types';
import { ReadingDisplay } from './ReadingDisplay';
import { allVocabulary } from '../data/vocabulary';
import { allKanji } from '../data/kanji';
import { useStudy } from '../context/StudyContext';
import { AddWordModal } from './AddWordModal';
import { FastPassTag } from './FastPassTag';
import { getNextReviewDate, getNextReviewShortLabel } from '../utils/srs';

interface ItemCardProps {
    type: CardType;
    item: Kanji | Vocabulary;
    mnemonic?: Mnemonic | null;
    compact?: boolean;
    onNavigate?: (type: CardType, item: Kanji | Vocabulary) => void;
    nextReviewAt?: number;
    fastPassCardIds?: string[];
}

export function ItemCard({ type, item, mnemonic, compact = false, onNavigate, nextReviewAt, fastPassCardIds }: ItemCardProps) {
    const isKanji = type === 'kanji';
    // Type guards/casting for specific properties
    const kanjiItem = isKanji ? (item as Kanji) : null;
    const vocabItem = !isKanji ? (item as Vocabulary) : null;
    const { state, setKanjiExamples } = useStudy();

    // Editing state
    const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Get the effective examples for this kanji (overrides take priority)
    const kanjiExamples = useMemo((): KanjiExample[] => {
        if (!isKanji || !kanjiItem) return [];
        if (state.kanjiExampleOverrides[kanjiItem.id]) {
            return state.kanjiExampleOverrides[kanjiItem.id];
        }
        return kanjiItem.examples || [];
    }, [isKanji, kanjiItem, state.kanjiExampleOverrides]);

    // Find vocabulary words containing this kanji character
    const wordsWithKanji = useMemo(() => {
        if (!isKanji || !kanjiItem) return [];

        const isOverridden = !!state.kanjiExampleOverrides[kanjiItem.id];
        const char = kanjiItem.character;

        let examplesToUse: KanjiExample[] = [];

        if (isOverridden) {
            examplesToUse = state.kanjiExampleOverrides[kanjiItem.id].slice(0, 3);
        } else {
            const seen = new Set<string>();
            const initial = kanjiItem.examples || [];
            for (const ex of initial) {
                if (!seen.has(ex.word)) {
                    seen.add(ex.word);
                    examplesToUse.push(ex);
                }
            }

            if (examplesToUse.length < 3) {
                // Prioritize same JLPT level words first
                const sameLevelWords = allVocabulary.filter(v => v.word.includes(char) && v.jlptLevel === kanjiItem.jlptLevel);
                for (const v of sameLevelWords) {
                    if (examplesToUse.length >= 3) break;
                    if (!seen.has(v.word)) {
                        seen.add(v.word);
                        examplesToUse.push({
                            word: v.word,
                            reading: v.reading,
                            meaning: v.meaning[0] || '',
                        });
                    }
                }
            }

            if (examplesToUse.length < 3) {
                // Fill remaining slots with any level
                const browseWords = allVocabulary.filter(v => v.word.includes(char));
                for (const v of browseWords) {
                    if (examplesToUse.length >= 3) break;
                    if (!seen.has(v.word)) {
                        seen.add(v.word);
                        examplesToUse.push({
                            word: v.word,
                            reading: v.reading,
                            meaning: v.meaning[0] || '',
                        });
                    }
                }
            }

            if (examplesToUse.length < 3) {
                const customWords = state.customCards.filter(c => c.type === 'vocabulary' && c.word.includes(char));
                for (const c of customWords) {
                    if (examplesToUse.length >= 3) break;
                    if (!seen.has(c.word)) {
                        seen.add(c.word);
                        examplesToUse.push({
                            word: c.word,
                            reading: c.reading || '',
                            meaning: c.meaning[0] || '',
                        });
                    }
                }
            }
        }

        const seenFinal = new Set<string>();
        const combined: { word: string; reading: string; meaning: string; item: Vocabulary }[] = [];
        for (const ex of examplesToUse) {
            if (!seenFinal.has(ex.word)) {
                seenFinal.add(ex.word);
                const fullItem = allVocabulary.find(v => v.word === ex.word) ||
                    state.customCards.find(c => c.word === ex.word) as unknown as Vocabulary;

                combined.push({
                    word: ex.word,
                    reading: ex.reading,
                    meaning: ex.meaning,
                    item: fullItem || ({
                        id: `ex-${ex.word}`,
                        word: ex.word,
                        reading: ex.reading,
                        meaning: [ex.meaning],
                        jlptLevel: kanjiItem.jlptLevel
                    } as Vocabulary)
                });
            }
        }
        return combined;
    }, [isKanji, kanjiItem, state.kanjiExampleOverrides, state.customCards]);

    // Find kanji characters composing a vocabulary word (Bug 3)
    const kanjiInWord = useMemo(() => {
        if (isKanji || !vocabItem) return [];
        const chars = [...vocabItem.word];
        const results: { kanji: Kanji; }[] = [];
        const seen = new Set<string>();
        for (const ch of chars) {
            if (seen.has(ch)) continue;
            seen.add(ch);
            const found = allKanji.find(k => k.character === ch);
            if (found) {
                results.push({ kanji: found });
            }
        }
        return results;
    }, [isKanji, vocabItem]);

    // Long-press handlers for editing words
    const isLongPressTriggered = useRef(false);

    const handlePressStart = useCallback((index: number) => {
        isLongPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressTriggered.current = true;
            setEditingWordIndex(index);
        }, 500);
    }, []);

    const handlePressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleRemoveWord = useCallback((wordToRemove: string) => {
        if (!kanjiItem) return;
        const currentList = wordsWithKanji.map(w => ({ word: w.word, reading: w.reading, meaning: w.meaning }));
        const filtered = currentList.filter(ex => ex.word !== wordToRemove);
        setKanjiExamples(kanjiItem.id, filtered);
        setEditingWordIndex(null);
    }, [kanjiItem, wordsWithKanji, setKanjiExamples]);

    if (compact) {
        return (
            <div style={{ padding: 'var(--space-4)' }}>
                {/* Compact Header: Kanji Left, Metadata Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', gap: 'var(--space-4)' }}>
                    <div style={{ flexShrink: 0 }}>
                        <div
                            className="font-japanese"
                            style={{
                                fontSize: isKanji ? '3.5rem' : '2rem',
                                color: 'var(--color-text-primary)',
                                lineHeight: 1
                            }}
                        >
                            {isKanji ? kanjiItem?.character : vocabItem?.word}
                        </div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span
                                className={`jlpt-badge jlpt-n${item.jlptLevel}`}
                                style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                                N{item.jlptLevel}
                            </span>
                            {type !== 'grammar' && <FastPassTag cardIds={fastPassCardIds || [item.id]} compact />}
                            {isKanji && kanjiItem && kanjiItem.frequency && kanjiItem.frequency < 9999 && (
                                <span
                                    className="jlpt-badge"
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    #{kanjiItem.frequency}
                                </span>
                            )}
                        </div>

                        <div className="text-lg font-bold text-primary" style={{ lineHeight: 1.2 }}>
                            {item.meaning.join(', ')}
                        </div>

                        {isKanji && kanjiItem && (
                            <div className="text-xs text-text-tertiary" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                {kanjiItem.onyomi.length > 0 && <span>On: {kanjiItem.onyomi.join(', ')}</span>}
                                {kanjiItem.kunyomi.length > 0 && (
                                    <span>Kun: {kanjiItem.kunyomi.map((r, i) => (
                                        <Fragment key={i}>
                                            <ReadingDisplay reading={r} />
                                            {i < kanjiItem.kunyomi.length - 1 && ', '}
                                        </Fragment>
                                    ))}</span>
                                )}
                            </div>
                        )}

                        {!isKanji && vocabItem && (
                            <div className="text-sm font-japanese text-text-secondary">
                                {vocabItem.reading}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Vocabulary Examples Section (vocab only) */}
                    {!isKanji && vocabItem?.examples && (
                        <div>
                            <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Examples</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {vocabItem.examples.map((ex, i) => (
                                    <div key={i} style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <div className="font-japanese font-bold" style={{ minWidth: 0, fontSize: '0.85rem' }}>{ex.sentence}</div>
                                        <div className="text-xs text-secondary text-right font-medium" style={{ flexShrink: 0, maxWidth: '40%' }}>{ex.translation}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Words containing this kanji (compact / review mode: 3 fixed slots, editable via long-press) */}
                    {isKanji && kanjiItem && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <h3 className="section-title text-secondary text-xs uppercase tracking-wider" style={{ margin: 0 }}>Found in Words</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (wordsWithKanji.length >= 3) {
                                            alert('Maximum 3 words allowed. Please remove a word first.');
                                        } else {
                                            setShowAddModal(true);
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: '1px dashed var(--color-primary-light, var(--color-primary))',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        padding: '1px 6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Plus size={10} /> Add
                                </button>
                            </div>
                            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                                <tbody>
                                    <tr>
                                        {[0, 1, 2].map((i) => {
                                            const w = wordsWithKanji[i];
                                            const isEditing = editingWordIndex === i;
                                            return (
                                                <td
                                                    key={i}
                                                    className="font-japanese"
                                                    style={{
                                                        padding: '0.1rem 0.5rem',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        color: w ? 'var(--color-primary)' : 'transparent',
                                                        borderLeft: i > 0 ? '1px solid var(--color-bg-tertiary)' : 'none',
                                                        cursor: w ? 'pointer' : 'default',
                                                        height: '1.25rem',
                                                        position: 'relative',
                                                        userSelect: 'none',
                                                        WebkitUserSelect: 'none',
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isLongPressTriggered.current) {
                                                            isLongPressTriggered.current = false;
                                                            return;
                                                        }
                                                        if (editingWordIndex !== null) {
                                                            setEditingWordIndex(null);
                                                            return;
                                                        }
                                                        if (w && onNavigate) onNavigate('vocabulary', w.item);
                                                    }}
                                                    onMouseDown={(e) => { e.stopPropagation(); if (w) handlePressStart(i); }}
                                                    onMouseUp={(e) => { e.stopPropagation(); handlePressEnd(); }}
                                                    onMouseLeave={(e) => { e.stopPropagation(); handlePressEnd(); }}
                                                    onTouchStart={(e) => { e.stopPropagation(); if (w) handlePressStart(i); }}
                                                    onTouchEnd={(e) => { e.stopPropagation(); handlePressEnd(); }}
                                                    onTouchCancel={(e) => { e.stopPropagation(); handlePressEnd(); }}
                                                    onContextMenu={(e) => e.preventDefault()}
                                                >
                                                    {w ? w.word : '\u00A0'}
                                                    {isEditing && w && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveWord(w.word);
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '-4px',
                                                                right: '2px',
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'var(--color-error, #e74c3c)',
                                                                border: '1px solid var(--color-bg-card)',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 0,
                                                                zIndex: 10,
                                                            }}
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr>
                                        {[0, 1, 2].map((i) => {
                                            const w = wordsWithKanji[i];
                                            return (
                                                <td key={i} className="font-japanese" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem', color: w ? 'var(--color-text-secondary)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--color-bg-tertiary)' : 'none', height: '1.1rem' }}>
                                                    {w ? w.reading : '\u00A0'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr>
                                        {[0, 1, 2].map((i) => {
                                            const w = wordsWithKanji[i];
                                            return (
                                                <td key={i} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem', color: w ? 'var(--color-text-tertiary)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--color-bg-tertiary)' : 'none', height: '1.1rem' }}>
                                                    {w ? w.meaning : '\u00A0'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>

                            {/* Add Word Modal (compact/review mode) */}
                            {showAddModal && kanjiItem && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <AddWordModal
                                        kanjiCharacter={kanjiItem.character}
                                        kanjiId={kanjiItem.id}
                                        currentExamples={wordsWithKanji.map(w => ({ word: w.word, reading: w.reading, meaning: w.meaning }))}
                                        onClose={() => setShowAddModal(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Kanji in this word (compact vocab view) */}
                    {!isKanji && vocabItem && kanjiInWord.length > 0 && (
                        <div>
                            <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Kanji</h3>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                {kanjiInWord.map(({ kanji }) => (
                                    <button
                                        key={kanji.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onNavigate) onNavigate('kanji', kanji);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            padding: '0.2rem 0.5rem',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.15s',
                                        }}
                                    >
                                        <span className="font-japanese" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{kanji.character}</span>
                                        <span className={`jlpt-badge jlpt-n${kanji.jlptLevel}`} style={{ fontSize: '0.6rem', padding: '0px 4px', lineHeight: '1.4' }}>N{kanji.jlptLevel}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>{kanji.meaning[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mnemonic (StudyCard support) */}
                    {mnemonic && (
                        <div style={{
                            padding: 'var(--space-3)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(217, 119, 87, 0.2)'
                        }}>
                            <h3 className="text-primary text-xs uppercase tracking-wider mb-1">Your Mnemonic</h3>
                            <p className="text-sm text-text-primary italic">"{mnemonic.text}"</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem' }}>

            {/* Main Character Display */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                    className="font-japanese"
                    style={{
                        fontSize: isKanji ? '5rem' : '2.5rem',
                        color: 'var(--color-text-primary)',
                        marginBottom: '0.5rem'
                    }}
                >
                    {isKanji ? kanjiItem?.character : vocabItem?.word}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            backgroundColor: `var(--color-n${item.jlptLevel})`,
                            color: 'white'
                        }}
                    >
                        N{item.jlptLevel}
                    </span>
                    {type !== 'grammar' && <FastPassTag cardIds={fastPassCardIds || [item.id]} />}
                    {isKanji && kanjiItem && kanjiItem.frequency && kanjiItem.frequency < 9999 && (
                        <span
                            style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)'
                            }}
                            title="Frequency Rank"
                        >
                            #{kanjiItem.frequency}
                        </span>
                    )}
                    {nextReviewAt !== undefined && (
                        <span
                            className="review-due-tag review-due-tag-detail"
                            title={`Next review: ${getNextReviewDate(nextReviewAt)}`}
                        >
                            {getNextReviewShortLabel(nextReviewAt)}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Meanings */}
                <div>
                    <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Meaning</h3>
                    <div className="text-xl font-bold text-primary">
                        {item.meaning.join(', ')}
                    </div>
                </div>

                {/* Kanji Readings */}
                {isKanji && kanjiItem && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">On'yomi</h3>
                            <div className="font-japanese text-lg">
                                {kanjiItem.onyomi.join('、') || '-'}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">Kun'yomi</h3>
                            <div className="font-japanese text-lg">
                                {kanjiItem.kunyomi.length > 0 ? kanjiItem.kunyomi.map((r, i) => (
                                    <Fragment key={i}>
                                        <ReadingDisplay reading={r} />
                                        {i < kanjiItem.kunyomi.length - 1 && '、'}
                                    </Fragment>
                                )) : '-'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Vocabulary Reading */}
                {!isKanji && vocabItem && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">Reading</h3>
                        <div className="font-japanese text-xl">
                            {vocabItem.reading}
                        </div>
                    </div>
                )}



                {/* Words containing this kanji — 3 fixed slots, editable via long-press */}
                {isKanji && kanjiItem && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 className="text-secondary text-xs uppercase tracking-wider" style={{ margin: 0 }}>Found in Words</h3>
                            <button
                                onClick={() => {
                                    if (kanjiExamples.length >= 3) {
                                        alert('Maximum 3 words allowed. Please remove a word first.');
                                    } else {
                                        setShowAddModal(true);
                                    }
                                }}
                                style={{
                                    background: 'none',
                                    border: '1px dashed var(--color-primary-light, var(--color-primary))',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    padding: '2px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                }}
                            >
                                <Plus size={12} /> Add
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {[0, 1, 2].map((i) => {
                                const w = wordsWithKanji[i];
                                if (!w) {
                                    return (
                                        <div
                                            key={`empty-slot-${i}`}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px dashed var(--color-bg-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minHeight: '44px',
                                                opacity: 0.35,
                                                userSelect: 'none',
                                            }}
                                        >
                                            <span className="text-xs text-tertiary">Empty space</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={`${w.word}-${i}`}
                                        style={{
                                            position: 'relative',
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            cursor: onNavigate ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            WebkitUserSelect: 'none',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isLongPressTriggered.current) {
                                                isLongPressTriggered.current = false;
                                                return;
                                            }
                                            if (editingWordIndex !== null) {
                                                setEditingWordIndex(null);
                                                return;
                                            }
                                            if (w.item) onNavigate?.('vocabulary', w.item);
                                        }}
                                        onMouseDown={() => handlePressStart(i)}
                                        onMouseUp={handlePressEnd}
                                        onMouseLeave={handlePressEnd}
                                        onTouchStart={() => handlePressStart(i)}
                                        onTouchEnd={handlePressEnd}
                                        onTouchCancel={handlePressEnd}
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                <span className="font-japanese" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>{w.word}</span>
                                                <span className="font-japanese" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{w.reading}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>{w.meaning}</div>
                                        </div>

                                        {/* Delete button — shown on long-press */}
                                        {editingWordIndex === i && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveWord(w.word);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '-6px',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--color-error, #e74c3c)',
                                                    border: '2px solid var(--color-bg-card)',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 0,
                                                    zIndex: 1,
                                                    animation: 'fadeIn 0.15s ease-out',
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Word Modal */}
                        {showAddModal && kanjiItem && (
                            <AddWordModal
                                kanjiCharacter={kanjiItem.character}
                                kanjiId={kanjiItem.id}
                                currentExamples={wordsWithKanji.map(w => ({ word: w.word, reading: w.reading, meaning: w.meaning }))}
                                onClose={() => setShowAddModal(false)}
                            />
                        )}
                    </div>
                )}

                {/* Kanji in this word (full vocab view) */}
                {!isKanji && vocabItem && kanjiInWord.length > 0 && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">Kanji</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {kanjiInWord.map(({ kanji }) => (
                                <button
                                    key={kanji.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onNavigate) onNavigate('kanji', kanji);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: '0.35rem 0.65rem',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-bg-tertiary)',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    <span className="font-japanese" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{kanji.character}</span>
                                    <span className={`jlpt-badge jlpt-n${kanji.jlptLevel}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>N{kanji.jlptLevel}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{kanji.meaning[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isKanji && vocabItem?.examples && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-3">Examples</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {vocabItem.examples.map((ex, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <div className="font-japanese font-bold" style={{ minWidth: 0, fontSize: '0.95rem' }}>{ex.sentence}</div>
                                    <div className="text-sm text-secondary text-right font-medium" style={{ flexShrink: 0, maxWidth: '40%' }}>{ex.translation}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mnemonic (StudyCard support) */}
                {mnemonic && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(217, 119, 87, 0.2)'
                    }}>
                        <h3 className="text-primary text-xs uppercase tracking-wider mb-2">Your Mnemonic</h3>
                        <p className="text-text-primary italic">"{mnemonic.text}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
