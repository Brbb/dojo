import { useState, useEffect } from 'react';
import type { Kanji, Vocabulary, CardType, Mnemonic } from '../types';
import { ItemCard } from './ItemCard';

interface StudyCardProps {
    card: Kanji | Vocabulary;
    type: CardType;
    mnemonic?: Mnemonic | null;
    mode?: 'study' | 'review'; // 'study' = always revealed, 'review' = click to reveal
    onFlip?: (isFlipped: boolean) => void; // Optional callback for review mode
    onNavigate?: (type: CardType, item: Kanji | Vocabulary) => void;
    lastReview?: number | null;
    fastPassCardIds?: string[];
}

function getLastSeenLabel(lastReview: number | null | undefined): string {
    if (!lastReview) return 'Never seen before';

    const elapsedDays = Math.floor(Math.max(0, Date.now() - lastReview) / (24 * 60 * 60 * 1000));
    if (elapsedDays === 0) return 'Seen today';
    if (elapsedDays === 1) return 'Seen yesterday';
    return `Seen ${elapsedDays} days ago`;
}

export function StudyCard({ card, type, mnemonic, mode = 'study', onFlip, onNavigate, lastReview, fastPassCardIds }: StudyCardProps) {
    const [isRevealed, setIsRevealed] = useState(mode === 'study');

    // Reset state when card changes
    useEffect(() => {
        setIsRevealed(mode === 'study');
    }, [card.id, mode]);

    const handleFlip = () => {
        if (mode === 'review') {
            const nextState = !isRevealed;
            setIsRevealed(nextState);
            onFlip?.(nextState);
        }
    };

    const isKanji = type === 'kanji';
    const kanjiItem = isKanji ? (card as Kanji) : null;
    const vocabItem = !isKanji ? (card as Vocabulary) : null;

    // Study mode: Static display (no flip)
    if (mode === 'study') {
        return (
            <div className="flashcard-container static">
                <div className="flashcard-face card">
                    <ItemCard type={type} item={card} mnemonic={mnemonic} compact={false} onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    // Review mode: CSS Flip
    return (
        <div className="flashcard-container" onClick={handleFlip}>
            <div className={`flashcard ${isRevealed ? 'flipped' : ''}`}>
                {/* Front Face - Hidden */}
                <div className="flashcard-face flashcard-front">
                    <div className="text-center group">
                        <div
                            className="font-japanese mb-6 transition-transform duration-300 group-hover:scale-110"
                            style={{
                                fontSize: isKanji ? '6rem' : '4rem',
                                color: 'var(--color-text-primary)'
                            }}
                        >
                            {isKanji ? kanjiItem?.character : vocabItem?.word}
                        </div>
                        <div className="text-secondary text-sm font-medium tracking-widest uppercase">
                            TAP TO REVEAL
                        </div>
                    </div>
                </div>

                {/* Back Face - Revealed */}
                <div className="flashcard-face flashcard-back">
                    <ItemCard
                        type={type}
                        item={card}
                        mnemonic={mnemonic}
                        compact={true}
                        fastPassCardIds={fastPassCardIds}
                        onNavigate={onNavigate}
                    />
                    <div className="last-seen-label">{getLastSeenLabel(lastReview)}</div>
                </div>
            </div>
        </div>
    );
}
