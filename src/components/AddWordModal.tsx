import { useState, useMemo } from 'react';
import { Search, Loader2, X, Check, Plus } from 'lucide-react';
import { allVocabulary } from '../data/vocabulary';
import { useStudy } from '../context/StudyContext';
import type { KanjiExample } from '../types';

interface AddWordModalProps {
    kanjiCharacter: string;
    kanjiId: string;
    currentExamples: KanjiExample[];
    onClose: () => void;
}

interface SearchResult {
    word: string;
    reading: string;
    meaning: string;
    source: 'library' | 'custom' | 'jisho';
    alreadyLinked: boolean;
}

export function AddWordModal({ kanjiCharacter, kanjiId, currentExamples, onClose }: AddWordModalProps) {
    const { state, setKanjiExamples } = useStudy();
    const [query, setQuery] = useState('');
    const [jishoResults, setJishoResults] = useState<SearchResult[]>([]);
    const [loadingJisho, setLoadingJisho] = useState(false);
    const [searchedJisho, setSearchedJisho] = useState(false);

    const linkedWords = useMemo(() => new Set(currentExamples.map(e => e.word)), [currentExamples]);

    // Local results: library + custom vocab containing this kanji
    const localResults = useMemo(() => {
        const results: SearchResult[] = [];
        const seen = new Set<string>();

        const q = query.toLowerCase();

        // Library vocabulary containing the kanji character
        for (const v of allVocabulary) {
            if (!v.word.includes(kanjiCharacter)) continue;
            if (query && !v.word.includes(query) && !v.reading.includes(query) && !v.meaning.some(m => m.toLowerCase().includes(q))) continue;
            if (seen.has(v.word)) continue;
            seen.add(v.word);
            results.push({
                word: v.word,
                reading: v.reading,
                meaning: v.meaning[0],
                source: 'library',
                alreadyLinked: linkedWords.has(v.word),
            });
        }

        // Custom vocabulary cards containing the kanji character
        for (const c of state.customCards) {
            if (c.type !== 'vocabulary') continue;
            if (!c.word.includes(kanjiCharacter)) continue;
            if (query && !c.word.includes(query) && !(c.reading || '').includes(query) && !c.meaning.some(m => m.toLowerCase().includes(q))) continue;
            if (seen.has(c.word)) continue;
            seen.add(c.word);
            results.push({
                word: c.word,
                reading: c.reading || '',
                meaning: c.meaning[0],
                source: 'custom',
                alreadyLinked: linkedWords.has(c.word),
            });
        }

        return results;
    }, [query, kanjiCharacter, state.customCards, linkedWords]);

    const handleJishoSearch = async () => {
        if (!query) return;
        setLoadingJisho(true);
        setSearchedJisho(true);
        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`;
            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const results: SearchResult[] = [];
                const seen = new Set(localResults.map(r => r.word));
                for (const item of data.data.slice(0, 10)) {
                    const word = item.japanese[0]?.word || item.japanese[0]?.reading || '';
                    const reading = item.japanese[0]?.reading || '';
                    if (!word || seen.has(word)) continue;
                    // Only include words that contain the kanji
                    if (!word.includes(kanjiCharacter)) continue;
                    seen.add(word);
                    results.push({
                        word,
                        reading,
                        meaning: item.senses[0]?.english_definitions?.join(', ') || '',
                        source: 'jisho',
                        alreadyLinked: linkedWords.has(word),
                    });
                }
                setJishoResults(results);
            } else {
                setJishoResults([]);
            }
        } catch (err) {
            console.error('Jisho search error:', err);
            setJishoResults([]);
        } finally {
            setLoadingJisho(false);
        }
    };

    const handleAdd = (result: SearchResult) => {
        if (result.alreadyLinked) return;
        if (currentExamples.length >= 3) {
            alert('Maximum 3 words allowed. Please remove a word first.');
            return;
        }
        const newExample: KanjiExample = {
            word: result.word,
            reading: result.reading,
            meaning: result.meaning,
        };
        setKanjiExamples(kanjiId, [...currentExamples, newExample]);
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const allResults = [...localResults, ...jishoResults.filter(j => !localResults.some(l => l.word === j.word))];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
            }}
            onClick={handleOverlayClick}
        >
            <div
                className="animate-slide-up"
                style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                    maxWidth: '500px',
                    width: '100%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-xl)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <h3 className="font-bold" style={{ fontSize: '1rem' }}>
                        Add Word for <span className="font-japanese" style={{ color: 'var(--color-primary)' }}>{kanjiCharacter}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setSearchedJisho(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleJishoSearch(); }}
                            placeholder={`Search words with ${kanjiCharacter}...`}
                            autoFocus
                            style={{
                                flex: 1,
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-bg-tertiary)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '0.95rem',
                            }}
                        />
                        <button
                            onClick={handleJishoSearch}
                            disabled={loadingJisho || !query}
                            className="btn btn-secondary"
                            style={{ padding: '0 var(--space-3)', display: 'flex', alignItems: 'center' }}
                            title="Search Jisho"
                        >
                            {loadingJisho ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                    </div>
                    {!searchedJisho && query && (
                        <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-1)' }}>
                            Press Enter or tap 🔍 to search Jisho for more results
                        </p>
                    )}
                </div>

                {/* Results */}
                <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--space-2) var(--space-4)' }}>
                    {allResults.length === 0 && !loadingJisho && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-tertiary)' }}>
                            {query
                                ? 'No matching words found. Try searching Jisho.'
                                : `Showing words containing ${kanjiCharacter}`
                            }
                        </div>
                    )}

                    {/* Show local results without query too */}
                    {!query && localResults.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-tertiary)' }}>
                            No vocabulary words found containing {kanjiCharacter}. Try searching above.
                        </div>
                    )}

                    {allResults.map((result, i) => (
                        <button
                            key={`${result.source}-${result.word}-${i}`}
                            onClick={() => handleAdd(result)}
                            disabled={result.alreadyLinked}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: 'var(--space-3)',
                                marginBottom: 'var(--space-2)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-bg-tertiary)',
                                backgroundColor: result.alreadyLinked ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                                cursor: result.alreadyLinked ? 'default' : 'pointer',
                                opacity: result.alreadyLinked ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                                transition: 'background-color 0.15s',
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                                    <span className="font-japanese font-bold" style={{ fontSize: '1rem' }}>{result.word}</span>
                                    <span className="font-japanese text-sm text-secondary">{result.reading}</span>
                                </div>
                                <div className="text-xs text-tertiary" style={{ marginTop: '2px' }}>{result.meaning}</div>
                            </div>
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                {result.source === 'custom' && (
                                    <span className="text-xs" style={{
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--color-accent)',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                    }}>
                                        CUSTOM
                                    </span>
                                )}
                                {result.source === 'jisho' && (
                                    <span className="text-xs" style={{
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                    }}>
                                        JISHO
                                    </span>
                                )}
                                {result.alreadyLinked
                                    ? <Check size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                                    : <Plus size={16} style={{ color: 'var(--color-primary)' }} />
                                }
                            </div>
                        </button>
                    ))}

                    {loadingJisho && (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-tertiary)' }}>
                            <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
