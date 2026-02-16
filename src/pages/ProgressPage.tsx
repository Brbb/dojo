import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { ProgressRing, ProgressBar } from '../components/Progress';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import { grammarTopics, grammarStats } from '../data/grammar/grammar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CardStatus } from '../utils/srs';
import type { SRSCard } from '../types';

const STATUS_CONFIG: { key: CardStatus; label: string; color: string }[] = [
    { key: 'new', label: 'New', color: 'var(--color-info)' },
    { key: 'learning', label: 'Learning', color: 'var(--color-warning)' },
    { key: 'review', label: 'Review', color: 'var(--color-primary-light)' },
    { key: 'mastered', label: 'Mastered', color: 'var(--color-success)' },
];

function getCardDisplayInfo(srsCard: SRSCard): { label: string; sublabel: string } | null {
    if (srsCard.cardType === 'kanji') {
        const kanji = allKanji.find(k => k.id === srsCard.cardId);
        if (!kanji) return null;
        return { label: kanji.character, sublabel: kanji.meaning.join(', ') };
    } else {
        const vocab = allVocabulary.find(v => v.id === srsCard.cardId);
        if (!vocab) return null;
        return { label: vocab.word, sublabel: vocab.meaning.join(', ') };
    }
}

export function ProgressPage() {
    const { state, getStats, getCardsByStatus } = useStudy();
    const stats = getStats();
    const { progress, grammarProgress } = state;
    const cardsByStatus = getCardsByStatus();

    const [expandedStatus, setExpandedStatus] = useState<CardStatus | null>(null);
    const [progressMode, setProgressMode] = useState<'kanji' | 'vocabulary' | 'grammar'>('kanji');

    const toggleStatus = (status: CardStatus) => {
        setExpandedStatus(prev => prev === status ? null : status);
    };

    const totalContent = allKanji.length + allVocabulary.length + grammarStats.totalPoints;
    const overallProgress = totalContent > 0 ? (stats.total / totalContent) * 100 : 0;

    // Calculate level-specific progress based on selected mode
    const levelProgress = [5, 4, 3, 2, 1].map(level => {
        let total = 0;
        let studied = 0;

        if (progressMode === 'kanji') {
            total = allKanji.filter(k => k.jlptLevel === level).length;
            studied = Object.values(state.srsCards).filter(card => {
                if (card.cardType !== 'kanji') return false;
                const data = allKanji.find(k => k.id === card.cardId);
                return data?.jlptLevel === level;
            }).length;
        } else if (progressMode === 'vocabulary') {
            total = allVocabulary.filter(v => v.jlptLevel === level).length;
            studied = Object.values(state.srsCards).filter(card => {
                if (card.cardType !== 'vocabulary') return false;
                const data = allVocabulary.find(v => v.id === card.cardId);
                return data?.jlptLevel === level;
            }).length;
        } else if (progressMode === 'grammar') {
            const levelTopics = grammarTopics.filter(t => t.level === level);
            const levelPoints = levelTopics.flatMap(t => t.grammarPoints);
            total = levelPoints.length;
            studied = levelPoints.filter(p => grammarProgress && grammarProgress[p.id]).length;
        }

        return {
            level,
            total,
            studied,
            progress: total > 0 ? (studied / total) * 100 : 0,
        };
    });

    return (
        <div className="page container">
            <header style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="text-2xl font-bold">Your Progress</h1>
                <p className="text-secondary">Track your learning journey</p>
            </header>

            {/* Overall Progress */}
            <section className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                <ProgressRing progress={overallProgress} size={100}>
                    <div>
                        <div className="text-xl font-bold">{Math.round(overallProgress)}%</div>
                        <div className="text-xs text-tertiary">Overall</div>
                    </div>
                </ProgressRing>

                <div style={{ flex: 1 }}>
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Statistics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div>
                            <div className="text-lg font-bold">{progress.cardsLearned}</div>
                            <div className="text-xs text-tertiary">Cards Learned</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold">{progress.cardsReviewed}</div>
                            <div className="text-xs text-tertiary">Total Reviews</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold">{progress.currentStreak}</div>
                            <div className="text-xs text-tertiary">Current Streak</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold">{progress.longestStreak}</div>
                            <div className="text-xs text-tertiary">Longest Streak</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Card Status Breakdown — Expandable */}
            <section style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Card Status</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {STATUS_CONFIG.map(({ key, label, color }) => {
                        const cards = cardsByStatus[key];
                        const isExpanded = expandedStatus === key;
                        return (
                            <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <button
                                    onClick={() => toggleStatus(key)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-4)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'inherit',
                                        font: 'inherit',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        {isExpanded
                                            ? <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
                                            : <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
                                        }
                                        <span className="font-medium">{label}</span>
                                    </div>
                                    <span className="text-lg font-bold" style={{ color }}>{cards.length}</span>
                                </button>
                                {isExpanded && cards.length > 0 && (
                                    <div style={{
                                        borderTop: '1px solid var(--color-border)',
                                        maxHeight: '240px',
                                        overflowY: 'auto',
                                    }}>
                                        {cards.map(srsCard => {
                                            const info = getCardDisplayInfo(srsCard);
                                            if (!info) return null;
                                            return (
                                                <div
                                                    key={srsCard.cardId}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-3)',
                                                        padding: 'var(--space-3) var(--space-4)',
                                                        borderBottom: '1px solid var(--color-border)',
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: srsCard.cardType === 'kanji' ? '1.4rem' : '1rem',
                                                        fontWeight: 600,
                                                        minWidth: '2.5rem',
                                                        textAlign: 'center',
                                                    }}>
                                                        {info.label}
                                                    </span>
                                                    <span className="text-sm text-secondary" style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {info.sublabel}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {isExpanded && cards.length === 0 && (
                                    <div style={{
                                        borderTop: '1px solid var(--color-border)',
                                        padding: 'var(--space-4)',
                                        textAlign: 'center',
                                    }}>
                                        <span className="text-sm text-tertiary">No cards in this category</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* JLPT Level Progress with Tabs */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h2 className="text-lg font-semibold">Progress</h2>
                    <div className="button-group" style={{
                        display: 'flex',
                        background: 'var(--color-bg-secondary)',
                        padding: 'var(--space-1)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)'
                    }}>
                        {(['kanji', 'vocabulary', 'grammar'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setProgressMode(mode)}
                                style={{
                                    padding: 'var(--space-1) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: progressMode === mode ? 'var(--color-primary)' : 'transparent',
                                    color: progressMode === mode ? 'white' : 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {levelProgress.map(({ level, total, studied, progress: prog }) => (
                        <div key={level} className="card" style={{ padding: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                <span className={`jlpt-badge jlpt-n${level}`}>N{level}</span>
                                <span className="text-sm text-secondary">{studied} / {total}</span>
                            </div>
                            <ProgressBar progress={prog} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
