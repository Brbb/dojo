import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyCard } from '../components/StudyCard';
import { RatingButtons } from '../components/RatingButtons';
import { JLPTSelector } from '../components/JLPTSelector';
import { ProgressBar } from '../components/Progress';
import { MnemonicEditor } from '../components/MnemonicEditor';
import type { Kanji, Vocabulary, JLPTLevel, SRSRating } from '../types';

type StudyMode = 'kanji' | 'vocabulary';

export function StudyPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, rateCard, saveMnemonic, getMnemonic, getNewKanji, getNewVocabulary } = useStudy();

    const [mode, setMode] = useState<StudyMode>((searchParams.get('mode') as StudyMode) || 'kanji');
    const [levels, setLevels] = useState<JLPTLevel[]>(state.settings.selectedLevels);
    const [isStudying, setIsStudying] = useState(false);
    const [cards, setCards] = useState<(Kanji | Vocabulary)[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);

    // const { key: flashcardKey, reset: resetFlashcard } = useFlashcardReset();

    // Load cards when starting study
    const startStudy = useCallback(() => {
        const count = state.settings.dailyNewCards;
        const newCards = mode === 'kanji'
            ? getNewKanji(levels, count)
            : getNewVocabulary(levels, count);

        if (newCards.length === 0) {
            alert('No new cards available for the selected levels!');
            return;
        }

        setCards(newCards);
        setCurrentIndex(0);
        setIsStudying(true);
        setSessionComplete(false);
        // key changes will reset card state automatically
    }, [mode, levels, state.settings.dailyNewCards, getNewKanji, getNewVocabulary]);

    const handleRate = (rating: SRSRating) => {
        const currentCard = cards[currentIndex];
        rateCard(currentCard.id, mode, rating);

        // Move to next card
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            // key changes will reset card state automatically
        } else {
            setSessionComplete(true);
        }
    };

    const handleSaveMnemonic = (text: string) => {
        const currentCard = cards[currentIndex];
        saveMnemonic(currentCard.id, mode, text);
    };

    const currentCard = cards[currentIndex];
    const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

    // Selection screen
    if (!isStudying) {
        return (
            <div className="page container">
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 className="text-2xl font-bold">Study Mode</h1>
                    <p className="text-secondary">Choose what to study</p>
                </header>

                {/* Mode Selection */}
                <section style={{ marginBottom: 'var(--space-6)' }}>
                    <label className="label">Study Type</label>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            className={`btn ${mode === 'kanji' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('kanji')}
                            style={{ flex: 1 }}
                        >
                            漢字 Kanji
                        </button>
                        <button
                            className={`btn ${mode === 'vocabulary' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('vocabulary')}
                            style={{ flex: 1 }}
                        >
                            単語 Vocabulary
                        </button>
                    </div>
                </section>

                {/* Level Selection */}
                <section style={{ marginBottom: 'var(--space-8)' }}>
                    <label className="label">JLPT Levels</label>
                    <JLPTSelector selectedLevels={levels} onChange={setLevels} multiple />
                </section>

                {/* Start Button */}
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startStudy}>
                    Start Studying
                </button>
            </div>
        );
    }

    // Session complete screen
    if (sessionComplete) {
        return (
            <div className="page container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-6)' }}>🎉</div>
                <h1 className="text-2xl font-bold" style={{ marginBottom: 'var(--space-2)' }}>
                    Session Complete!
                </h1>
                <p className="text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
                    You studied {cards.length} cards
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back Home
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                        setIsStudying(false);
                        setCards([]);
                    }}>
                        Study More
                    </button>
                </div>
            </div>
        );
    }

    // Study screen
    return (
        <div className="page container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Progress */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span className="text-sm text-secondary">Card {currentIndex + 1} of {cards.length}</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            setIsStudying(false);
                            setCards([]);
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
                    key={currentCard.id}
                    card={currentCard}
                    type={mode}
                    mnemonic={getMnemonic(currentCard.id)}
                    mode="study"
                />

                {/* Rating Buttons (Always visible) */}
                <RatingButtons
                    onRate={handleRate}
                />
            </div>

            {/* Mnemonic Editor (Always visible, toggleable) */}
            <MnemonicEditor
                cardId={currentCard.id}
                initialText={getMnemonic(currentCard.id)?.text || ''}
                onSave={handleSaveMnemonic}
            />
        </div>
    );
}
