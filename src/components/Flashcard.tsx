import { useState, useRef, useCallback, Fragment, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import type { Kanji, Vocabulary, Mnemonic, KanjiExample } from '../types';
import { ReadingDisplay } from './ReadingDisplay';
import { allVocabulary } from '../data/vocabulary';
import { useStudy } from '../context/StudyContext';
import { AddWordModal } from './AddWordModal';

type CardType = 'kanji' | 'vocabulary'; // Define CardType based on existing usage

interface FlashcardProps {
    card: Kanji | Vocabulary;
    type: CardType;
    mnemonic?: Mnemonic | null;
    isFlipped?: boolean; // Added for controlled state
    onFlip?: (isFlipped: boolean) => void;
    onNavigate?: (type: CardType, item: Kanji | Vocabulary) => void; // Added onNavigate
}

export function Flashcard({ card, type, mnemonic, isFlipped: controlledIsFlipped, onFlip, onNavigate }: FlashcardProps) {
    // Use internal state if not controlled, otherwise use the prop
    const [internalIsFlipped, setInternalIsFlipped] = useState(false);
    const isFlipped = controlledIsFlipped !== undefined ? controlledIsFlipped : internalIsFlipped;

    const { state, setKanjiExamples } = useStudy();

    // Editing state for words in review card
    const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFlip = () => {
        const nextState = !isFlipped;
        setInternalIsFlipped(nextState);
        onFlip?.(nextState);
    };

    const isKanji = type === 'kanji';
    const kanjiCard = card as Kanji;
    const vocabCard = card as Vocabulary;

    // Find vocabulary words containing this kanji character
    const wordsWithKanji = useMemo(() => {
        if (!isKanji || !kanjiCard) return [];

        const isOverridden = !!state.kanjiExampleOverrides[kanjiCard.id];
        const char = kanjiCard.character;

        let examplesToUse: KanjiExample[] = [];

        if (isOverridden) {
            examplesToUse = state.kanjiExampleOverrides[kanjiCard.id].slice(0, 3);
        } else {
            const seen = new Set<string>();
            const initial = kanjiCard.examples || [];
            for (const ex of initial) {
                if (!seen.has(ex.word)) {
                    seen.add(ex.word);
                    examplesToUse.push(ex);
                }
            }

            if (examplesToUse.length < 3) {
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
                        jlptLevel: kanjiCard.jlptLevel
                    } as Vocabulary)
                });
            }
        }
        return combined;
    }, [isKanji, kanjiCard, state.kanjiExampleOverrides, state.customCards]);

    // Long-press handlers for editing words in Flashcard
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
        if (!kanjiCard) return;
        const currentList = wordsWithKanji.map(w => ({ word: w.word, reading: w.reading, meaning: w.meaning }));
        const filtered = currentList.filter(ex => ex.word !== wordToRemove);
        setKanjiExamples(kanjiCard.id, filtered);
        setEditingWordIndex(null);
    }, [kanjiCard, wordsWithKanji, setKanjiExamples]);

    return (
        <div className="flashcard-container" onClick={handleFlip}>
            <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                {/* Front of card */}
                <div className="flashcard-face flashcard-front">
                    <span className={`jlpt-badge jlpt-n${card.jlptLevel}`}>
                        N{card.jlptLevel}
                    </span>
                    <div className="flashcard-type-badge">
                        {isKanji ? '漢字' : '単語'}
                    </div>

                    <div
                        className="flashcard-kanji japanese"
                        style={{
                            fontSize: !isKanji ? '3rem' : undefined,
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                        }}
                    >
                        {isKanji ? kanjiCard.character : vocabCard.word}
                    </div>



                    <p className="text-sm text-tertiary" style={{ marginTop: 'auto' }}>
                        Tap to reveal
                    </p>
                </div>

                {/* Back of card */}
                <div className="flashcard-face flashcard-back">
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <span className={`jlpt-badge jlpt-n${card.jlptLevel}`}>
                            N{card.jlptLevel}
                        </span>
                        {isKanji && kanjiCard.frequency && kanjiCard.frequency < 9999 && (
                            <span
                                className="jlpt-badge"
                                style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)'
                                }}
                            >
                                #{kanjiCard.frequency}
                            </span>
                        )}
                    </div>

                    <div className="flashcard-meaning">
                        {card.meaning.join(', ')}
                    </div>

                    {isKanji && (
                        <div className="flashcard-readings">
                            {kanjiCard.onyomi.length > 0 && (
                                <div className="reading-row">
                                    <span className="reading-label">On'yomi</span>
                                    <span className="reading-value japanese">
                                        {kanjiCard.onyomi.join('、')}
                                    </span>
                                </div>
                            )}
                            {kanjiCard.kunyomi.length > 0 && (
                                <div className="reading-row">
                                    <span className="reading-label">Kun'yomi</span>
                                    <span className="reading-value japanese">
                                        {kanjiCard.kunyomi.map((r, i) => (
                                            <Fragment key={i}>
                                                <ReadingDisplay reading={r} />
                                                {i < kanjiCard.kunyomi.length - 1 && '、'}
                                            </Fragment>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {!isKanji && (
                        <div className="flashcard-readings">
                            <div className="reading-row">
                                <span className="reading-label">Reading</span>
                                <span className="reading-value japanese">
                                    {vocabCard.reading}
                                </span>
                            </div>
                            <div className="reading-row">
                                <span className="reading-label">Type</span>
                                <span className="reading-value">{vocabCard.partOfSpeech}</span>
                            </div>
                        </div>
                    )}

                    {mnemonic && mnemonic.text && (
                        <div className="mnemonic-container">
                            <div className="mnemonic-header">
                                <span className="mnemonic-title">💡 Your Mnemonic</span>
                            </div>
                            <p className="mnemonic-text">{mnemonic.text}</p>
                        </div>
                    )}

                    {isKanji && kanjiCard && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <div className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Found in Words</div>
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
                                                        fontSize: '0.8rem',
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

                            {/* Add Word Modal in Review Flashcard */}
                            {showAddModal && kanjiCard && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <AddWordModal
                                        kanjiCharacter={kanjiCard.character}
                                        kanjiId={kanjiCard.id}
                                        currentExamples={wordsWithKanji.map(w => ({ word: w.word, reading: w.reading, meaning: w.meaning }))}
                                        onClose={() => setShowAddModal(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Reset the card flip state (useful when changing cards)
export function useFlashcardReset() {
    const [key, setKey] = useState(0);
    const reset = () => setKey(k => k + 1);
    return { key, reset };
}
