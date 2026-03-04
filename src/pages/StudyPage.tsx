import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyCard } from '../components/StudyCard';
import { JLPTSelector } from '../components/JLPTSelector';
import { ProgressBar } from '../components/Progress';
import { MnemonicEditor } from '../components/MnemonicEditor';
import {
    RefreshCcw, Scroll, Clock, Brain, Flame, GitBranch, GitCompare,
    Sparkles, CheckCircle2, Circle, MoreHorizontal
} from 'lucide-react';
import { grammarTopics, type GrammarTopic } from '../data/grammar/grammar';
import type { Kanji, Vocabulary, JLPTLevel, SRSRating } from '../types';

type StudyMode = 'kanji' | 'vocabulary' | 'grammar';

const getTopicIcon = (topicId: string) => {
    const t = topicId.toLowerCase();
    if (t.includes('cause') || t.includes('relation') || t.includes('change')) return <RefreshCcw size={20} />;
    if (t.includes('instruction') || t.includes('rule')) return <Scroll size={20} />;
    if (t.includes('time') || t.includes('sequence')) return <Clock size={20} />;
    if (t.includes('opinion') || t.includes('state')) return <Brain size={20} />;
    if (t.includes('certainty') || t.includes('doubt')) return <Flame size={20} />;
    if (t.includes('relationship') || t.includes('contrast')) return <GitBranch size={20} />;
    if (t.includes('formal') || t.includes('abstract')) return <GitCompare size={20} />;
    if (t.includes('everyday') || t.includes('conversational')) return <Sparkles size={20} />;
    return <MoreHorizontal size={20} />;
};

export function StudyPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, rateCard, saveMnemonic, toggleGrammarStudied, getMnemonic, getNewKanji, getNewVocabulary } = useStudy();
    const { grammarProgress } = state;

    const [mode, setMode] = useState<StudyMode>((searchParams.get('mode') as StudyMode) || 'kanji');
    const [levels, setLevels] = useState<JLPTLevel[]>(state.settings.selectedLevels);
    const [cards, setCards] = useState<(Kanji | Vocabulary)[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isStudying, setIsStudying] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [selectedGrammarTopic, setSelectedGrammarTopic] = useState<GrammarTopic | null>(null);

    const startSession = useCallback(() => {
        let newCards: (Kanji | Vocabulary)[] = [];
        if (mode === 'kanji') {
            newCards = getNewKanji(levels, state.settings.dailyNewCards);
        } else if (mode === 'vocabulary') {
            newCards = getNewVocabulary(levels, state.settings.dailyNewCards);
        }
        setCards(newCards);
        setCurrentIndex(0);
        setIsStudying(true);
        setSessionComplete(false);
    }, [mode, levels, state.settings.dailyNewCards, getNewKanji, getNewVocabulary]);

    const handleRate = (rating: SRSRating) => {
        const currentCard = cards[currentIndex];
        rateCard(currentCard.id, mode as 'kanji' | 'vocabulary', rating);

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
        }
    };

    if (mode === 'grammar') {
        if (selectedGrammarTopic) {
            return (
                <div className="page container">
                    <button
                        onClick={() => setSelectedGrammarTopic(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                        ← Back to Topics
                    </button>

                    <header style={{ marginBottom: 'var(--space-8)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
                            <span className={`jlpt-badge jlpt-n${selectedGrammarTopic.level}`}>N{selectedGrammarTopic.level}</span>
                            <h1 className="text-2xl font-bold">{selectedGrammarTopic.topic}</h1>
                        </div>
                        <p className="text-secondary">{selectedGrammarTopic.description}</p>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-12)' }}>
                        {selectedGrammarTopic.grammarPoints.map((gp) => (
                            <div key={gp.id} className="card" style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                                    <div>
                                        <h2 style={{ fontFamily: 'var(--font-japanese)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-1)' }}>
                                            {gp.point}
                                        </h2>
                                        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                            {gp.meaning}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleGrammarStudied(gp.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: grammarProgress[gp.id] ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                                            transition: 'color 0.2s ease',
                                            padding: 'var(--space-1)'
                                        }}
                                        title={grammarProgress && grammarProgress[gp.id] ? "Marked as learned" : "Mark as learned"}
                                    >
                                        {grammarProgress && grammarProgress[gp.id] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </button>
                                </div>
                                <div style={{ paddingLeft: 'var(--space-4)', borderLeft: '2px solid var(--color-bg-tertiary)' }}>
                                    <p style={{ fontFamily: 'var(--font-japanese)', fontSize: 'var(--text-base)', lineHeight: 1.6, marginBottom: 'var(--space-1)' }}>{gp.exampleJp}</p>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{gp.exampleEn}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const filteredTopics = grammarTopics.filter(t => levels.includes(t.level));

        return (
            <div className="page container">
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 className="text-2xl font-bold">Grammar Topics</h1>
                    <p className="text-secondary">Explore particles, active structures, and patterns</p>
                </header>

                <JLPTSelector
                    selectedLevels={levels}
                    onChange={setLevels}
                />

                <div className="grid grid-2" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                    {filteredTopics.map((topic, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedGrammarTopic(topic)}
                            className="card study-card animate-slide-up"
                            style={{
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 'var(--space-4)',
                                border: '1px solid var(--color-bg-tertiary)',
                                cursor: 'pointer',
                            }}
                        >
                            <div className="mode-icon" style={{ color: 'var(--color-primary)' }}>
                                {getTopicIcon(topic.id)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                                    <h3 className="font-bold">{topic.topic}</h3>
                                    <span className={`jlpt-badge jlpt-n${topic.level}`} style={{ fontSize: 'var(--text-xs)' }}>N{topic.level}</span>
                                </div>
                                <p className="text-sm text-secondary line-clamp-2">{topic.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (isStudying) {
        if (sessionComplete) {
            return (
                <div className="page container center">
                    <div className="card text-center animate-bounce-in" style={{ maxWidth: '400px' }}>
                        <h2 className="text-2xl font-bold mb-4">Session Complete! 🎉</h2>
                        <p className="text-secondary mb-6">You've studied {cards.length} new {mode} cards.</p>
                        <button onClick={() => setIsStudying(false)} className="btn btn-primary w-full">Back to Study</button>
                    </div>
                </div>
            );
        }

        const currentCard = cards[currentIndex];
        if (!currentCard) return null;

        return (
            <div className="page container center">
                <div style={{ width: '100%', maxWidth: '500px' }}>
                    <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            onClick={() => setIsStudying(false)}
                            className="btn btn-secondary"
                            style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
                        >
                            ← Exit
                        </button>
                        <div className="text-sm font-medium">
                            {currentIndex + 1} / {cards.length}
                        </div>
                    </div>

                    <ProgressBar progress={((currentIndex + 1) / cards.length) * 100} />

                    <div style={{ marginTop: 'var(--space-8)' }}>
                        <StudyCard card={currentCard} type={mode as 'kanji' | 'vocabulary'} />
                    </div>

                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <MnemonicEditor
                            cardId={currentCard.id}
                            initialText={getMnemonic(currentCard.id)?.text || ''}
                            onSave={(text) => saveMnemonic(currentCard.id, mode as 'kanji' | 'vocabulary', text)}
                        />
                    </div>

                    <div style={{ marginTop: 'var(--space-8)' }}>
                        <button onClick={() => handleRate('good')} className="btn btn-primary w-full">Next Card</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page container">
            <header style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="text-2xl font-bold">What will you study today?</h1>
                <p className="text-secondary">Select a mode and level to begin</p>
            </header>

            <div className="button-group-row" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-8)',
                background: 'var(--color-bg-secondary)',
                padding: 'var(--space-1)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-bg-tertiary)'
            }}>
                {(['kanji', 'vocabulary', 'grammar'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => {
                            setMode(m);
                            navigate(`/study?mode=${m}`, { replace: true });
                        }}
                        style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-lg)',
                            border: 'none',
                            background: mode === m ? 'var(--color-primary)' : 'transparent',
                            color: mode === m ? 'white' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: 'var(--text-sm)',
                            boxShadow: mode === m ? '0 4px 12px rgba(255, 107, 0, 0.2)' : 'none'
                        }}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <JLPTSelector
                selectedLevels={levels}
                onChange={setLevels}
            />

            <div className="center" style={{ marginTop: 'var(--space-8)' }}>
                <button
                    onClick={startSession}
                    className="btn btn-primary btn-lg"
                    disabled={levels.length === 0}
                    style={{ minWidth: '240px' }}
                >
                    Start Studying
                </button>
            </div>
        </div>
    );
}
