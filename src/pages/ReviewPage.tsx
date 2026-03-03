import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyCard } from '../components/StudyCard';
import { RatingButtons } from '../components/RatingButtons';
import { ProgressBar } from '../components/Progress';
import { MnemonicEditor } from '../components/MnemonicEditor';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import type { SRSRating, Kanji, Vocabulary } from '../types';
import reviewRacoon from '../assets/reviewracoon.png';
import freetime from '../assets/freetime.png';

export function ReviewPage() {
    const navigate = useNavigate();
    const { state, getDueCards, rateCard, saveMnemonic, getMnemonic } = useStudy();

    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewCards, setReviewCards] = useState<{ card: Kanji | Vocabulary; type: 'kanji' | 'vocabulary' }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);

    // const { key: flashcardKey, reset: resetFlashcard } = useFlashcardReset();

    const dueCards = getDueCards();

    // Load cards for review
    const startReview = useCallback(() => {
        const cardsToReview = dueCards.map(srsCard => {
            const isKanji = srsCard.cardType === 'kanji';

            // Try standard library first
            let data = isKanji
                ? allKanji.find(k => k.id === srsCard.cardId)
                : allVocabulary.find(v => v.id === srsCard.cardId);

            // If not found, try custom cards
            if (!data) {
                const custom = state.customCards.find(c => c.id === srsCard.cardId);
                if (custom) {
                    // Map CustomCard to a shape compatible with Kanji/Vocabulary for the UI
                    data = {
                        id: custom.id,
                        word: custom.word,
                        character: custom.word,
                        reading: custom.reading || '',
                        meaning: custom.meaning,
                        jlptLevel: custom.jlptLevel || 5,
                        onyomi: custom.onReading ? custom.onReading.split(/[、,]\s*/).filter(Boolean) : [],
                        kunyomi: custom.kunReading ? custom.kunReading.split(/[、,]\s*/).filter(Boolean) : [],
                        partOfSpeech: 'Custom'
                    } as any;
                }
            }

            if (!data) return null;
            return { card: data, type: srsCard.cardType as 'kanji' | 'vocabulary' };
        }).filter(Boolean) as { card: any; type: 'kanji' | 'vocabulary' }[];

        if (cardsToReview.length === 0) {
            return;
        }

        setReviewCards(cardsToReview);
        setCurrentIndex(0);
        setIsReviewing(true);
        setSessionComplete(false);
        // key changes will handle reset
    }, [dueCards]);

    const handleRate = (rating: SRSRating) => {
        const current = reviewCards[currentIndex];
        rateCard(current.card.id, current.type, rating);

        if (currentIndex < reviewCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            // key changes will handle reset
        } else {
            setSessionComplete(true);
        }
    };

    const handleSaveMnemonic = (text: string) => {
        const current = reviewCards[currentIndex];
        saveMnemonic(current.card.id, current.type, text);
    };

    // No cards due
    if (dueCards.length === 0 && !isReviewing) {
        return (
            <div className="page container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <img
                    src={freetime}
                    alt="Overview Logo"
                    style={{
                        height: '150px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover'
                    }}
                />
                <h1 className="text-2xl font-bold" style={{ marginBottom: 'var(--space-2)' }}>
                    All caught up!
                </h1>
                <p className="text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
                    No cards are due for review right now.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/study')}>
                    Learn New Cards
                </button>
            </div>
        );
    }

    // Review selection screen
    if (!isReviewing) {
        return (
            <div className="page container">
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 className="text-2xl font-bold">Review</h1>
                    <p className="text-secondary">There {dueCards.length > 1 ? "are" : "is"} <span className="text-l font-bold" style={{ color: 'var(--color-primary-light)', marginBottom: 'var(--space-2)' }}>{dueCards.length} </span>{dueCards.length > 1 ? "cards" : "card"} due
                    </p>
                </header>
                <img src={reviewRacoon} alt="Review Raccoon" style={{ width: '100%', height: 'auto', marginBottom: 'var(--space-2)', borderRadius: '50%' }} />
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startReview}>
                    Start Review
                </button>
            </div>
        );
    }

    // Session complete
    if (sessionComplete) {
        return (
            <div className="page container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-6)' }}>🎉</div>
                <h1 className="text-2xl font-bold" style={{ marginBottom: 'var(--space-2)' }}>
                    Review Complete!
                </h1>
                <p className="text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
                    You reviewed {reviewCards.length} cards
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    Back Home
                </button>
            </div>
        );
    }

    // Review screen
    const current = reviewCards[currentIndex];
    const progress = ((currentIndex + 1) / reviewCards.length) * 100;

    return (
        <div className="page container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Progress */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span className="text-sm text-secondary">Review {currentIndex + 1} of {reviewCards.length}</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            setIsReviewing(false);
                            setReviewCards([]);
                        }}
                    >
                        Exit
                    </button>
                </div>
                <ProgressBar progress={progress} />
            </div>

            {/* Main Content: Flashcard + Buttons */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', minHeight: 0 }}>
                <StudyCard
                    key={current.card.id}
                    card={current.card}
                    type={current.type}
                    mnemonic={getMnemonic(current.card.id)}
                    mode="review"
                />

                {/* Rating Buttons (Always visible) */}
                <RatingButtons
                    onRate={handleRate}
                />
            </div>

            {/* Mnemonic Editor (Always visible, toggleable) */}
            <MnemonicEditor
                key={current.card.id}
                cardId={current.card.id}
                initialText={getMnemonic(current.card.id)?.text || ''}
                onSave={handleSaveMnemonic}
            />
        </div>
    );
}
