import { useState, Fragment } from 'react';
import type { Kanji, Vocabulary, Mnemonic } from '../types';
import { ReadingDisplay } from './ReadingDisplay';

interface FlashcardProps {
    card: Kanji | Vocabulary;
    type: 'kanji' | 'vocabulary';
    mnemonic?: Mnemonic | null;
    onFlip?: (isFlipped: boolean) => void;
}

export function Flashcard({ card, type, mnemonic, onFlip }: FlashcardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        const newState = !isFlipped;
        setIsFlipped(newState);
        onFlip?.(newState);
    };

    const isKanji = type === 'kanji';
    const kanjiCard = card as Kanji;
    const vocabCard = card as Vocabulary;

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
                                Frequency: #{kanjiCard.frequency}
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
