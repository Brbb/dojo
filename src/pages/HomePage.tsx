import { useStudy } from '../context/StudyContext';
import { ProgressRing } from '../components/Progress';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import readyRaccoon from '../assets/ReadyRaccoon.png';

const LibraryIcon = ({ size = 24, color = 'currentColor' }: { size?: number, color?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m16 6 4 14" />
        <path d="M12 6v14" />
        <path d="M8 8v12" />
        <path d="M4 4v16" />
    </svg>
);
import overviewLogo from '../assets/Overview_logo.png';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import { grammarStats } from '../data/grammar/grammar';

export function HomePage() {
    const { state, getStats, getDueCards } = useStudy();
    const stats = getStats();
    const dueCards = getDueCards();
    const { progress } = state;

    // Calculate total available content
    const totalKanji = allKanji.length;
    const totalVocab = allVocabulary.length;
    const totalContent = totalKanji + totalVocab;
    const progressPercent = totalContent > 0
        ? Math.round((stats.total / totalContent) * 100)
        : 0;

    return (
        <div className="page container">
            {/* Header */}
            <header style={{
                marginBottom: 'var(--space-8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <img
                    src={overviewLogo}
                    alt="Overview Logo"
                    style={{
                        height: '50px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover'
                    }}
                />
                {/* <h1 className="text-3xl">
                    <span style={{ color: 'var(--color-primary)' }}>
                        Overview
                    </span>
                </h1>
                <img
                    src={overviewLogo}
                    alt="Overview Logo"
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover'
                    }}
                /> */}
            </header>

            {/* Quick Stats */}
            <section className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                    <ProgressRing progress={progressPercent} size={100}>
                        <div>
                            <div className="text-2xl font-bold">{progressPercent}%</div>
                            <div className="text-xs text-tertiary">Complete</div>
                        </div>
                    </ProgressRing>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div>
                                <div className="text-2xl font-bold" style={{ color: 'var(--color-primary-light)' }}>
                                    {progress.cardsLearned}
                                </div>
                                <div className="text-sm text-tertiary">Cards Learned</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                                    {progress.currentStreak}
                                </div>
                                <div className="text-sm text-tertiary">Day Streak</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Activity Heatmap */}
            <ActivityHeatmap />

            {/* Due Cards Alert */}
            {dueCards.length > 0 && (
                <Link to="/review" style={{ textDecoration: 'none' }}>
                    <section
                        className="card animate-slide-up"
                        style={{
                            marginBottom: 'var(--space-6)',
                            background: '#f2f2ed',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <img src={readyRaccoon} alt="Ready Raccoon" style={{ width: '64px', height: 'auto', marginBottom: 'var(--space-2)' }} />
                            <div style={{ flex: 1 }}>
                                <div className="text-lg font-semibold" style={{ color: 'chocolate' }}>Pending reviews: {dueCards.length}</div>
                                <div className="text-sm text-secondary">Tap to start reviewing</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </section>
                </Link>
            )}

            {/* Quick Actions */}
            <section style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>
                    Start Learning
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <Link to="/study?mode=kanji" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon">漢</div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Study Kanji</div>
                                <div className="mode-subtitle">{totalKanji} kanji available</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>

                    <Link to="/study?mode=vocabulary" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon">語</div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Study Vocabulary</div>
                                <div className="mode-subtitle">{totalVocab} words available</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>

                    <Link to="/study?mode=grammar" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon" style={{ fontFamily: 'var(--font-japanese)' }}>文</div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Grammar Reference</div>
                                <div className="mode-subtitle">{grammarStats.totalPoints} grammar points available</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>

                </div>
            </section>

            {/* Library / Browse */}
            <section style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>
                    Reference
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <Link to="/browse" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                <LibraryIcon size={24} />
                            </div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Browse Library</div>
                                <div className="mode-subtitle">{totalContent} items available</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>

                    <Link to="/fast-pass" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                <LibraryIcon size={24} />
                            </div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Fast Pass Library</div>
                                <div className="mode-subtitle">Exam preparation words and kanji across JLPT levels</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>

                    <Link to="/custom-cards" style={{ textDecoration: 'none' }}>
                        <div className="mode-card">
                            <div className="mode-icon" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                <PlusCircle size={24} />
                            </div>
                            <div className="mode-content">
                                <div className="mode-title" style={{ color: 'chocolate' }}>Custom Items</div>
                                <div className="mode-subtitle">Manage your own kanji or vocabulary</div>
                            </div>
                            <div style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        </div>
                    </Link>
                </div>
            </section>

        </div>
    );
}
