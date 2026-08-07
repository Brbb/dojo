import { useState, Fragment, useMemo } from 'react';
import type { Kanji, Vocabulary, Mnemonic } from '../types';
import { ReadingDisplay } from './ReadingDisplay';
import { allVocabulary } from '../data/vocabulary';
import { useStudy } from '../context/StudyContext';

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

    const { state } = useStudy();

    const handleFlip = () => {
        const nextState = !isFlipped;
        setInternalIsFlipped(nextState);
        onFlip?.(nextState);
    };

    const isKanji = type === 'kanji';
    const kanjiCard = card as Kanji;
    const vocabCard = card as Vocabulary;

    // Find vocabulary words containing this kanji character (explicit top 3 examples only)
    const wordsWithKanji = useMemo(() => {
        if (!isKanji) return [];

        // Use override-aware examples
        const kanjiExamples = state.kanjiExampleOverrides[kanjiCard.id]
            ?? kanjiCard.examples
            ?? [];

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
                        jlptLevel: kanjiCard.jlptLevel
                    } as Vocabulary)
                });
            }
        }
        return combined;
    }, [isKanji, kanjiCard, state.customCards, state.kanjiExampleOverrides]);

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

                    {isKanji && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <div className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Found in Words</div>
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
                                                        fontSize: '0.8rem',
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
