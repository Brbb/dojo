import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyCard } from '../components/StudyCard';
import { RatingButtons } from '../components/RatingButtons';
import { ProgressBar } from '../components/Progress';
import { MnemonicEditor } from '../components/MnemonicEditor';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { JLPTSelector } from '../components/JLPTSelector';
import { matchesReviewFilters } from '../utils/reviewFilters';
import type { SRSRating, Kanji, Vocabulary, CardType, JLPTLevel } from '../types';
import reviewRacoon from '../assets/reviewracoon.png';
import freetime from '../assets/freetime.png';

type ReviewQueueItem = {
    card: Kanji | Vocabulary;
    type: 'kanji' | 'vocabulary';
    /** All SRS records represented by this one visible prompt. */
    cardIds: string[];
    lastReview: number | null;
};

export function ReviewPage() {
    const navigate = useNavigate();
    const { state, getDueCards, rateCard, saveMnemonic, getMnemonic, removeFromReview, isFastPass } = useStudy();

    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewCards, setReviewCards] = useState<ReviewQueueItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [peekItem, setPeekItem] = useState<{ type: CardType, item: Kanji | Vocabulary } | null>(null);
    const [reviewKanji, setReviewKanji] = useState(true);
    const [reviewVocab, setReviewVocab] = useState(true);
    const [fastPassOnly, setFastPassOnly] = useState(false);
    const [reviewLevels, setReviewLevels] = useState<JLPTLevel[]>([5, 4, 3, 2, 1]);

    // const { key: flashcardKey, reset: resetFlashcard } = useFlashcardReset();

    const allDueCards = getDueCards();

    const getCardData = (cardId: string, cardType: 'kanji' | 'vocabulary') => {
        const libraryCard = cardType === 'kanji'
            ? allKanji.find(k => k.id === cardId)
            : allVocabulary.find(v => v.id === cardId);

        if (libraryCard) return libraryCard;

        const custom = state.customCards.find(c => c.id === cardId);
        if (!custom) return null;

        // Map CustomCard to a shape compatible with Kanji/Vocabulary for the UI.
        return {
            id: custom.id,
            word: custom.word,
            character: custom.word,
            reading: custom.reading || '',
            meaning: custom.meaning,
            jlptLevel: custom.jlptLevel || 5,
            onyomi: custom.onReading ? custom.onReading.split(/[、,]\s*/).filter(Boolean) : [],
            kunyomi: custom.kunReading ? custom.kunReading.split(/[、,]\s*/).filter(Boolean) : [],
            frequency: custom.frequency,
            partOfSpeech: 'Custom',
        } as Kanji | Vocabulary;
    };

    const dueCards = allDueCards.filter(c => {
        if (c.cardType !== 'kanji' && c.cardType !== 'vocabulary') return false;
        const card = getCardData(c.cardId, c.cardType);
        return !!card && matchesReviewFilters(c.cardType, card.jlptLevel, isFastPass(c.cardId), {
            kanji: reviewKanji,
            vocabulary: reviewVocab,
            fastPassOnly,
            levels: reviewLevels,
        });
    });

    const repeatCounts = dueCards.reduce(
        (counts, srsCard) => {
            const cardType = srsCard.cardType as 'kanji' | 'vocabulary';
            const card = getCardData(srsCard.cardId, cardType);
            if (!card) return counts;

            const displayedValue = cardType === 'kanji'
                ? (card as Kanji).character
                : (card as Vocabulary).word;
            const key = `${cardType}:${displayedValue}`;
            const seen = counts.seen.get(key) || 0;
            counts.seen.set(key, seen + 1);
            if (seen > 0) counts[cardType] += 1;
            return counts;
        },
        { kanji: 0, vocabulary: 0, seen: new Map<string, number>() }
    );
    const totalRepeats = repeatCounts.kanji + repeatCounts.vocabulary;

    // Load cards for review
    const startReview = () => {
        const queueByDisplayedCard = new Map<string, ReviewQueueItem>();

        dueCards.forEach(srsCard => {
            const type = srsCard.cardType as 'kanji' | 'vocabulary';
            const card = getCardData(srsCard.cardId, type);
            if (!card) return;

            // Card IDs can differ even when they render as the same word/kanji.
            // Show that prompt once and apply its rating to each matching SRS record.
            const displayedValue = type === 'kanji'
                ? (card as Kanji).character
                : (card as Vocabulary).word;
            const key = `${type}:${displayedValue}`;
            const existing = queueByDisplayedCard.get(key);

            if (existing) {
                existing.cardIds.push(srsCard.cardId);
                if (srsCard.lastReview && (!existing.lastReview || srsCard.lastReview > existing.lastReview)) {
                    existing.lastReview = srsCard.lastReview;
                }
            } else {
                queueByDisplayedCard.set(key, { card, type, cardIds: [srsCard.cardId], lastReview: srsCard.lastReview });
            }
        });

        const cardsToReview = [...queueByDisplayedCard.values()];

        if (cardsToReview.length === 0) {
            return;
        }

        setReviewCards(cardsToReview);
        setCurrentIndex(0);
        setIsReviewing(true);
        setSessionComplete(false);
        // key changes will handle reset
    };

    const handleRate = (rating: SRSRating) => {
        const current = reviewCards[currentIndex];
        current.cardIds.forEach(cardId => rateCard(cardId, current.type, rating));

        if (currentIndex < reviewCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            // key changes will handle reset
        } else {
            setSessionComplete(true);
        }
    };

    const handleRemoveFromReview = () => {
        const current = reviewCards[currentIndex];
        current.cardIds.forEach(removeFromReview);
        const updated = reviewCards.filter((_, i) => i !== currentIndex);
        if (updated.length === 0) {
            setSessionComplete(true);
        } else {
            setReviewCards(updated);
            setCurrentIndex(Math.min(currentIndex, updated.length - 1));
        }
    };

    const handleSaveMnemonic = (text: string) => {
        const current = reviewCards[currentIndex];
        saveMnemonic(current.card.id, current.type, text);
    };

    // No cards due
    if (allDueCards.length === 0 && !isReviewing) {
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
            <div className="page container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 className="text-2xl font-bold">Review</h1>
                    <p className="text-secondary">There {dueCards.length > 1 ? "are" : "is"} <span className="text-l font-bold" style={{ color: 'var(--color-primary-light)', marginBottom: 'var(--space-2)' }}>{dueCards.length} </span>{dueCards.length > 1 ? "cards" : "card"} due
                    </p>
                    <p className="text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
                        Repeats: {repeatCounts.vocabulary} word{repeatCounts.vocabulary === 1 ? '' : 's'} · {repeatCounts.kanji} kanji{totalRepeats > 0 ? '. Repeated cards appear once in this session.' : ''}
                    </p>
                </header>

                <img src={reviewRacoon} alt="Review Raccoon" style={{ width: '100%', height: 'auto', marginBottom: 'var(--space-4)', borderRadius: '50%', flex: '0 0 auto' }} />

                {/* Spacer to push buttons to bottom */}
                <div style={{ flex: 1 }} />

                {/* Type Filters */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-3)',
                }}>
                    <button
                        onClick={() => {
                            setReviewKanji(!reviewKanji);
                        }}
                        style={{
                            flex: 1,
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${reviewKanji ? 'var(--color-primary)' : 'var(--color-bg-tertiary)'}`,
                            background: reviewKanji ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                            color: reviewKanji ? 'white' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: reviewKanji ? 1 : 0.6,
                        }}
                    >
                        漢字 Kanji
                    </button>
                    <button
                        onClick={() => {
                            setReviewVocab(!reviewVocab);
                        }}
                        style={{
                            flex: 1,
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${reviewVocab ? 'var(--color-primary)' : 'var(--color-bg-tertiary)'}`,
                            background: reviewVocab ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                            color: reviewVocab ? 'white' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: reviewVocab ? 1 : 0.6,
                        }}
                    >
                        辞書 Vocab
                    </button>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-2)' }}>JLPT levels</p>
                    <JLPTSelector selectedLevels={reviewLevels} onChange={setReviewLevels} />
                    <button
                        type="button"
                        className={`fast-pass-tag ${fastPassOnly ? 'active' : ''}`}
                        style={{ marginTop: 'var(--space-3)' }}
                        aria-pressed={fastPassOnly}
                        onClick={() => setFastPassOnly(!fastPassOnly)}
                    >
                        Fast Pass only
                    </button>
                    <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-2)' }}>
                        {fastPassOnly ? 'Only Fast Pass words and kanji due for the selected types and levels.' : 'Filter words and kanji from mock tests and the N3 Fast Pass book.'}
                    </p>
                    {dueCards.length === 0 && <p className="text-sm text-secondary">No due cards match these filters.</p>}
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    onClick={startReview}
                    disabled={dueCards.length === 0}
                >
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
                    lastReview={current.lastReview}
                    fastPassCardIds={current.cardIds}
                    onNavigate={(type, item) => setPeekItem({ type, item })}
                />

                {/* Rating Buttons (Always visible) */}
                <RatingButtons
                    onRate={handleRate}
                />

                {/* Remove from Review */}
                <button
                    onClick={handleRemoveFromReview}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-tertiary)',
                        textDecoration: 'underline',
                        padding: 'var(--space-1) var(--space-2)',
                    }}
                >
                    Remove from Review
                </button>
            </div>

            {/* Mnemonic Editor (Always visible, toggleable) */}
            <MnemonicEditor
                key={current.card.id}
                cardId={current.card.id}
                initialText={getMnemonic(current.card.id)?.text || ''}
                onSave={handleSaveMnemonic}
            />

            {peekItem && (
                <ItemDetailModal
                    type={peekItem.type}
                    item={peekItem.item}
                    onClose={() => setPeekItem(null)}
                    onNavigate={(type, item) => setPeekItem({ type, item })}
                />
            )}
        </div>
    );
}
