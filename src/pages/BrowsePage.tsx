import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { allKanji, searchKanji } from '../data/kanji';
import { allVocabulary, searchVocabulary } from '../data/vocabulary';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { Search } from 'lucide-react';
import type { JLPTLevel, Kanji, Vocabulary, CardType } from '../types';

export function BrowsePage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<CardType>('kanji');
    const [levelFilter, setLevelFilter] = useState<JLPTLevel | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<{ type: CardType, item: Kanji | Vocabulary } | null>(null);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 200);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const filteredItems = useMemo(() => {
        if (!debouncedSearchQuery) return [];

        let items: (Kanji | Vocabulary)[] = [];

        // 1. Get Base Items & Search
        if (tab === 'kanji') {
            items = searchKanji(debouncedSearchQuery);
        } else {
            items = searchVocabulary(debouncedSearchQuery);
        }

        // 2. Filter by Level
        if (levelFilter !== 'all') {
            items = items.filter(item => item.jlptLevel === levelFilter);
        }

        // 3. Sort logic: Level first (N5, N4, N3...), then Frequency
        return [...items].sort((a, b) => {
            // Primary sort: JLPT Level (Descending: 5, 4, 3, 2, 1)
            if (b.jlptLevel !== a.jlptLevel) {
                return b.jlptLevel - a.jlptLevel;
            }

            // Secondary sort: Frequency for Kanji
            if (tab === 'kanji') {
                const aFreq = (a as Kanji).frequency || 9999;
                const bFreq = (b as Kanji).frequency || 9999;
                return aFreq - bFreq;
            }

            // Secondary sort for Vocabulary: Alphabetical by reading
            const aReading = (a as Vocabulary).reading || '';
            const bReading = (b as Vocabulary).reading || '';
            return aReading.localeCompare(bReading, 'ja');
        });
    }, [tab, levelFilter, debouncedSearchQuery]);

    const levels: JLPTLevel[] = [5, 4, 3, 2, 1];

    return (
        <div className="page container pb-24">
            {/* Header */}
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.5rem' }}
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold">Library</h1>
            </header>

            {/* Controls */}
            <div className="flex flex-col gap-4 mb-6">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search characters, meanings, readings..."
                    className="input w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Type Toggle */}
                {/* Type Toggle */}
                <div className="flex gap-3 mb-2">
                    <button
                        className={`btn flex-1 ${tab === 'kanji' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('kanji')}
                    >
                        漢字 Kanji ({debouncedSearchQuery ? filteredItems.length : allKanji.length})
                    </button>
                    <button
                        className={`btn flex-1 ${tab === 'vocabulary' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('vocabulary')}
                    >
                        辞書 Jisho ({debouncedSearchQuery ? filteredItems.length : allVocabulary.length})
                    </button>
                </div>

                {/* Level Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ marginBottom: 'var(--space-2)' }}>
                    <button
                        className={`jlpt-toggle ${levelFilter === 'all' ? 'active' : ''}`}
                        style={{
                            background: levelFilter === 'all' ? 'var(--color-primary)' : 'var(--color-bg-card)',
                            color: levelFilter === 'all' ? 'white' : 'var(--color-text-secondary)',
                            minWidth: '60px'
                        }}
                        onClick={() => setLevelFilter('all')}
                    >
                        All
                    </button>
                    {levels.map(l => (
                        <button
                            key={l}
                            className={`jlpt-toggle n${l} ${levelFilter === l ? 'active' : ''}`}
                            onClick={() => setLevelFilter(l)}
                        >
                            N{l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid/List */}
            {!searchQuery ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                    <Search size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="text-lg">Type to search characters or words</p>
                    <p className="text-sm opacity-60">Results appear as you type</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-text-tertiary">
                    No items found matching your filters.
                </div>
            ) : tab === 'kanji' ? (
                // Kanji Grid - 5 columns
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.75rem' }}>
                    {filteredItems.map((item) => {
                        const k = item as Kanji;
                        return (
                            <button
                                key={k.id}
                                className="card aspect-square flex flex-col items-center justify-center transition-all"
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderLeft: `3.5px solid var(--color-n${k.jlptLevel})`,
                                    paddingLeft: 'calc(0.5rem - 1.75px)' // Adjust padding to center character
                                }}
                                onClick={() => setSelectedItem({ type: 'kanji', item: k })}
                            >
                                <span className="kanji mb-1 text-text-primary" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{k.character}</span>
                                <span className="text-xs text-text-tertiary truncate w-full px-1 text-center" style={{ fontSize: '0.65rem' }}>{k.meaning[0]}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                // Vocabulary List
                <div className="flex flex-col gap-3">
                    {filteredItems.map((item) => {
                        const v = item as Vocabulary;
                        return (
                            <button
                                key={v.id}
                                className="card flex items-center justify-between p-4 transition-all text-left"
                                style={{
                                    display: 'flex',
                                    padding: 'var(--space-4)',
                                    width: '100%',
                                    marginBottom: '0',
                                    gap: 'var(--space-4)',
                                    textAlign: 'left',
                                    borderLeft: `4px solid var(--color-n${v.jlptLevel})`,
                                    paddingLeft: 'calc(var(--space-4) - 2px)'
                                }}
                                onClick={() => setSelectedItem({ type: 'vocabulary', item: v })}
                            >
                                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div className="kanji font-bold text-text-primary truncate" style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>{v.word}</div>
                                    <div className="text-sm text-text-tertiary truncate japanese">{v.reading}</div>
                                </div>
                                <div className="text-right flex items-center gap-4 flex-shrink-0">
                                    <div className="text-base font-medium text-text-secondary truncate" style={{ maxWidth: '120px', textAlign: 'right' }}>{v.meaning[0]}</div>
                                    <div style={{ width: '45px', display: 'flex', justifyContent: 'center' }}>
                                        <span
                                            className={`jlpt-badge jlpt-n${v.jlptLevel}`}
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            N{v.jlptLevel}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {selectedItem && (
                <ItemDetailModal
                    type={selectedItem.type}
                    item={selectedItem.item}
                    onClose={() => setSelectedItem(null)}
                    onNavigate={(type, item) => setSelectedItem({ type, item })}
                />
            )}
        </div>
    );
}
