import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { allKanji, searchKanji } from '../data/kanji';
import { allVocabulary, searchVocabulary } from '../data/vocabulary';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { Search, Zap } from 'lucide-react';
import type { JLPTLevel, Kanji, Vocabulary, CardType, CustomCard } from '../types';
import { useStudy } from '../context/StudyContext';
import { getNextReviewDate, getNextReviewShortLabel } from '../utils/srs';
import { filterLibraryItems } from '../utils/library';

export function BrowsePage({ fastPass = false }: { fastPass?: boolean }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { state, isFastPass, setFastPass } = useStudy();
    const [tab, setTab] = useState<CardType>(() => searchParams.get('type') === 'vocabulary'
        ? 'vocabulary' : searchParams.get('type') === 'kanji' ? 'kanji' : fastPass ? 'vocabulary' : 'kanji');
    const [levelFilter, setLevelFilter] = useState<JLPTLevel | 'all'>(() => {
        const level = Number(searchParams.get('level'));
        return [1, 2, 3, 4, 5].includes(level) ? level as JLPTLevel : 'all';
    });
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

    const libraryItems = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        const customMatches = (card: CustomCard) => (
            !query || card.word.toLowerCase().includes(query) ||
            [card.reading, card.onReading, card.kunReading].some(reading => reading?.toLowerCase().includes(query)) ||
            card.meaning.some(meaning => meaning.toLowerCase().includes(query))
        );
        const customVocabulary: Vocabulary[] = state.customCards
            .filter(card => card.type === 'vocabulary' && customMatches(card))
            .map(card => ({
                id: card.id, word: card.word, reading: card.reading || '',
                meaning: card.meaning, jlptLevel: card.jlptLevel || 5, partOfSpeech: 'Custom',
            }));
        const customKanji: Kanji[] = state.customCards
            .filter(card => card.type === 'kanji' && customMatches(card))
            .map(card => ({
                id: card.id, character: card.word, meaning: card.meaning,
                onyomi: card.onReading ? [card.onReading] : [],
                kunyomi: card.kunReading ? [card.kunReading] : (card.reading ? [card.reading] : []),
                jlptLevel: card.jlptLevel || 5, frequency: card.frequency || 9999,
            }));
        return {
            kanji: filterLibraryItems([...(query ? searchKanji(debouncedSearchQuery) : allKanji), ...customKanji], levelFilter, fastPass, isFastPass),
            vocabulary: filterLibraryItems([...(query ? searchVocabulary(debouncedSearchQuery) : allVocabulary), ...customVocabulary], levelFilter, fastPass, isFastPass),
        };
    }, [levelFilter, debouncedSearchQuery, state.customCards, fastPass, isFastPass]);

    const filteredItems = useMemo(() => {
        const items: (Kanji | Vocabulary)[] = tab === 'kanji' ? libraryItems.kanji : libraryItems.vocabulary;
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
    }, [tab, libraryItems]);

    const levels: JLPTLevel[] = [5, 4, 3, 2, 1];
    const switchCollection = () => {
        const nextTab = !fastPass && tab === 'kanji' && !libraryItems.kanji.some(item => isFastPass(item.id))
            ? 'vocabulary' : tab;
        const params = new URLSearchParams({ type: nextTab });
        if (levelFilter !== 'all') params.set('level', String(levelFilter));
        navigate(`${fastPass ? '/browse' : '/fast-pass'}?${params}`);
    };

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
                <h1 className="text-2xl font-bold">{fastPass ? 'Fast Pass Library' : 'Library'}</h1>
            </header>

            {/* Controls */}
            <div className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search characters, meanings, readings..."
                    className="input w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Type Toggle */}
                <div className="library-type-filter">
                    <button
                        className={`btn flex-1 ${tab === 'kanji' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('kanji')}
                    >
                        漢字 Kanji ({libraryItems.kanji.length})
                    </button>
                    <button
                        className={`btn flex-1 ${tab === 'vocabulary' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('vocabulary')}
                    >
                        辞書 Jisho ({libraryItems.vocabulary.length})
                    </button>
                </div>

                {/* Level Filter */}
                <div className="library-level-filter" role="group" aria-label="JLPT level filters">
                    {levels.map(l => (
                        <button
                            key={l}
                            className={`jlpt-toggle n${l} ${levelFilter === l ? 'active' : ''}`}
                            aria-pressed={levelFilter === l}
                            title={levelFilter === l ? 'Show all levels' : `Show N${l} only`}
                            onClick={() => setLevelFilter(levelFilter === l ? 'all' : l)}
                        >
                            N{l}
                        </button>
                    ))}
                </div>
                <div className="library-fast-pass-filter">
                    <span className="library-fast-pass-label"><Zap size={16} aria-hidden="true" /> Fast Pass only</span>
                    <button
                        type="button"
                        className={`library-switch ${fastPass ? 'active' : ''}`}
                        role="switch"
                        aria-label="Fast Pass only"
                        aria-checked={fastPass}
                        onClick={switchCollection}
                    >
                        <span className="library-switch-thumb" />
                    </button>
                </div>
            </div>

            {/* Results Grid/List */}
            {!searchQuery && !fastPass && levelFilter === 'all' ? (
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
                        const srsCard = state.srsCards[k.id];
                        const fastPassEnabled = isFastPass(k.id);
                        return (
                            <div
                                key={k.id}
                                className="card aspect-square flex flex-col items-center justify-center transition-all"
                                style={{
                                    padding: '0.5rem',
                                    position: 'relative',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderLeft: `3.5px solid var(--color-n${k.jlptLevel})`,
                                    paddingLeft: 'calc(0.5rem - 1.75px)' // Adjust padding to center character
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem({ type: 'kanji', item: k })}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 0, border: 0, background: 'none', cursor: 'pointer' }}
                                >
                                    <span className="kanji mb-1 text-text-primary" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{k.character}</span>
                                    <span className="text-xs text-text-tertiary truncate w-full px-1 text-center" style={{ fontSize: '0.65rem' }}>{k.meaning[0]}</span>
                                    {srsCard && (
                                        <span
                                            className="review-due-tag"
                                            style={{ marginTop: 'var(--space-1)' }}
                                            title={`Next review: ${getNextReviewDate(srsCard.dueDate)}`}
                                        >
                                            {getNextReviewShortLabel(srsCard.dueDate)}
                                        </span>
                                    )}
                                </button>
                                {fastPassEnabled && (
                                    <button
                                        type="button"
                                        className="library-kanji-bolt"
                                        aria-label={`Remove ${k.character} from Fast Pass`}
                                        title="Remove from Fast Pass"
                                        onClick={() => setFastPass([k.id], false)}
                                    >
                                        <Zap size={14} fill="currentColor" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Vocabulary List
                <div className="flex flex-col gap-3">
                    {filteredItems.map((item) => {
                        const v = item as Vocabulary;
                        const srsCard = state.srsCards[v.id];
                        const fastPassEnabled = isFastPass(v.id);
                        return (
                            <div
                                key={v.id}
                                className="card flex items-center justify-between p-4 transition-all text-left"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 'var(--space-4)',
                                    width: '100%',
                                    marginBottom: '0',
                                    gap: 'var(--space-2)',
                                    textAlign: 'left',
                                    borderLeft: `4px solid var(--color-n${v.jlptLevel})`,
                                    paddingLeft: 'calc(var(--space-4) - 2px)'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem({ type: 'vocabulary', item: v })}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flex: 1, minWidth: 0, padding: 0, border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}
                                >
                                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div className="kanji font-bold text-text-primary truncate" style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>{v.word}</div>
                                        <div className="text-sm text-text-tertiary truncate japanese">{v.reading}</div>
                                    </div>
                                    <div className="text-right flex items-center gap-2 flex-shrink-0">
                                        <div className="text-base font-medium text-text-secondary truncate" style={{ maxWidth: '100px', textAlign: 'right' }}>{v.meaning[0]}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)' }}>
                                            <span
                                                className={`jlpt-badge jlpt-n${v.jlptLevel}`}
                                                style={{ fontSize: '0.7rem' }}
                                            >
                                                N{v.jlptLevel}
                                            </span>
                                            {srsCard && (
                                                <span
                                                    className="review-due-tag"
                                                    title={`Next review: ${getNextReviewDate(srsCard.dueDate)}`}
                                                >
                                                    {getNextReviewShortLabel(srsCard.dueDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="library-card-bolt"
                                    aria-pressed={fastPassEnabled}
                                    aria-label={fastPassEnabled ? `Remove ${v.word} from Fast Pass` : `Add ${v.word} to Fast Pass`}
                                    title={fastPassEnabled ? 'Remove from Fast Pass' : 'Add to Fast Pass'}
                                    onClick={() => setFastPass([v.id], !fastPassEnabled)}
                                >
                                    <Zap size={18} fill={fastPassEnabled ? 'currentColor' : 'none'} aria-hidden="true" />
                                </button>
                            </div>
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
