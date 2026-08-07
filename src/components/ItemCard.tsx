import { Fragment, useMemo, useState, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import type { Kanji, Vocabulary, CardType, Mnemonic, KanjiExample } from '../types';
import { ReadingDisplay } from './ReadingDisplay';
import { allVocabulary } from '../data/vocabulary';
import { useStudy } from '../context/StudyContext';
import { AddWordModal } from './AddWordModal';

interface ItemCardProps {
    type: CardType;
    item: Kanji | Vocabulary;
    mnemonic?: Mnemonic | null;
    compact?: boolean;
    onNavigate?: (type: CardType, item: Kanji | Vocabulary) => void;
}

export function ItemCard({ type, item, mnemonic, compact = false, onNavigate }: ItemCardProps) {
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

    // Find vocabulary words containing this kanji character (explicit top 3 examples only)
    const wordsWithKanji = useMemo(() => {
        if (!isKanji || !kanjiItem) return [];

        const seen = new Set<string>();
        const combined: { word: string; reading: string; meaning: string; item: Vocabulary }[] = [];
        for (const ex of kanjiExamples.slice(0, 3)) {
            if (!seen.has(ex.word)) {
                seen.add(ex.word);
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
    }, [isKanji, kanjiItem, kanjiExamples, state.customCards]);

    // Long-press handlers for editing words
    const handlePressStart = useCallback((index: number) => {
        longPressTimer.current = setTimeout(() => {
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
        // If no overrides exist yet, initialize from current examples
        const currentExamples = state.kanjiExampleOverrides[kanjiItem.id] || kanjiItem.examples || [];
        const filtered = currentExamples.filter(ex => ex.word !== wordToRemove);
        setKanjiExamples(kanjiItem.id, filtered);
        setEditingWordIndex(null);
    }, [kanjiItem, state.kanjiExampleOverrides, setKanjiExamples]);

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
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <span
                                className={`jlpt-badge jlpt-n${item.jlptLevel}`}
                                style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                                N{item.jlptLevel}
                            </span>
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

                    {/* Words containing this kanji (compact: 3 fixed slots, vacant = empty space) */}
                    {isKanji && (
                        <div>
                            <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Found in Words</h3>
                            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                                <tbody>
                                    <tr>
                                        {[0, 1, 2].map((i) => {
                                            const w = wordsWithKanji[i];
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
                                                        cursor: w && onNavigate ? 'pointer' : 'default',
                                                        height: '1.25rem',
                                                    }}
                                                    onClick={(e) => {
                                                        if (w) {
                                                            e.stopPropagation();
                                                            onNavigate?.('vocabulary', w.item);
                                                        }
                                                    }}
                                                >
                                                    {w ? w.word : '\u00A0'}
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
                                            if (editingWordIndex !== null) {
                                                setEditingWordIndex(null);
                                                return;
                                            }
                                            e.stopPropagation();
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
                                currentExamples={kanjiExamples}
                                onClose={() => setShowAddModal(false)}
                            />
                        )}
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
