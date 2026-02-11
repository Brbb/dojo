import { useStudy } from '../context/StudyContext';
import { ProgressRing, ProgressBar } from '../components/Progress';
import { allKanji, kanjiStats } from '../data/kanji';
import { allVocabulary, vocabularyStats } from '../data/vocabulary';

export function ProgressPage() {
    const { state, getStats } = useStudy();
    const stats = getStats();
    const { progress } = state;

    const totalContent = allKanji.length + allVocabulary.length;
    const overallProgress = totalContent > 0 ? (stats.total / totalContent) * 100 : 0;

    // Calculate level-specific progress
    const levelProgress = [5, 4, 3, 2, 1].map(level => {
        const levelKanji = allKanji.filter(k => k.jlptLevel === level).length;
        const levelVocab = allVocabulary.filter(v => v.jlptLevel === level).length;
        const total = levelKanji + levelVocab;

        const studied = Object.values(state.srsCards).filter(card => {
            const isKanji = card.cardType === 'kanji';
            const data = isKanji
                ? allKanji.find(k => k.id === card.cardId)
                : allVocabulary.find(v => v.id === card.cardId);
            return data?.jlptLevel === level;
        }).length;

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

            {/* Card Status Breakdown */}
            <section style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Card Status</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-info)' }}>{stats.new}</div>
                        <div className="stat-label">New</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.learning}</div>
                        <div className="stat-label">Learning</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-primary-light)' }}>{stats.review}</div>
                        <div className="stat-label">Review</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.mastered}</div>
                        <div className="stat-label">Mastered</div>
                    </div>
                </div>
            </section>

            {/* Content Overview */}
            <section style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Content</h2>
                <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span className="font-medium">漢字 Kanji</span>
                        <span className="text-secondary">{kanjiStats.total} available</span>
                    </div>
                    <ProgressBar
                        progress={(Object.values(state.srsCards).filter(c => c.cardType === 'kanji').length / kanjiStats.total) * 100}
                    />
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span className="font-medium">単語 Vocabulary</span>
                        <span className="text-secondary">{vocabularyStats.total} available</span>
                    </div>
                    <ProgressBar
                        progress={(Object.values(state.srsCards).filter(c => c.cardType === 'vocabulary').length / vocabularyStats.total) * 100}
                    />
                </div>
            </section>

            {/* JLPT Level Progress */}
            <section>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>By JLPT Level</h2>
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
