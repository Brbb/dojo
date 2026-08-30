import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, X, Check, Plus, Globe } from 'lucide-react';
import { allVocabulary } from '../data/vocabulary';
import { useStudy } from '../context/StudyContext';
import type { KanjiExample, JLPTLevel } from '../types';

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
    jlptLevel?: JLPTLevel | number;
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

        const q = query.trim().toLowerCase();

        // Library vocabulary containing the kanji character
        for (const v of allVocabulary) {
            if (!v.word.includes(kanjiCharacter)) continue;
            if (q && !v.word.toLowerCase().includes(q) && !v.reading.toLowerCase().includes(q) && !v.meaning.some(m => m.toLowerCase().includes(q))) continue;
            if (seen.has(v.word)) continue;
            seen.add(v.word);
            results.push({
                word: v.word,
                reading: v.reading,
                meaning: v.meaning[0] || '',
                source: 'library',
                jlptLevel: v.jlptLevel,
                alreadyLinked: linkedWords.has(v.word),
            });
        }

        // Custom vocabulary cards containing the kanji character
        for (const c of state.customCards) {
            if (c.type !== 'vocabulary') continue;
            if (!c.word.includes(kanjiCharacter)) continue;
            if (q && !c.word.toLowerCase().includes(q) && !(c.reading || '').toLowerCase().includes(q) && !c.meaning.some(m => m.toLowerCase().includes(q))) continue;
            if (seen.has(c.word)) continue;
            seen.add(c.word);
            results.push({
                word: c.word,
                reading: c.reading || '',
                meaning: c.meaning[0] || '',
                source: 'custom',
                jlptLevel: c.jlptLevel,
                alreadyLinked: linkedWords.has(c.word),
            });
        }

        // Sort results: unlinked first, then by JLPT level (N5 down to N1)
        return results.sort((a, b) => {
            if (a.alreadyLinked !== b.alreadyLinked) return a.alreadyLinked ? 1 : -1;
            const levelA = a.jlptLevel ?? 0;
            const levelB = b.jlptLevel ?? 0;
            return levelB - levelA;
        });
    }, [query, kanjiCharacter, state.customCards, linkedWords]);

    const handleJishoSearch = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setLoadingJisho(true);
        setSearchedJisho(true);
        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(trimmed)}`;
            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const results: SearchResult[] = [];
                const seen = new Set(localResults.map(r => r.word));
                for (const item of data.data.slice(0, 15)) {
                    const word = item.japanese[0]?.word || item.japanese[0]?.reading || '';
                    const reading = item.japanese[0]?.reading || '';
                    if (!word || seen.has(word)) continue;
                    // Only include words that contain the kanji
                    if (!word.includes(kanjiCharacter)) continue;
                    seen.add(word);

                    let jishoLevel: number | undefined = undefined;
                    if (item.jlpt && item.jlpt.length > 0) {
                        const match = item.jlpt[0].match(/jlpt-n(\d)/i);
                        if (match) jishoLevel = parseInt(match[1], 10);
                    }

                    results.push({
                        word,
                        reading,
                        meaning: item.senses[0]?.english_definitions?.join(', ') || '',
                        source: 'jisho',
                        jlptLevel: jishoLevel,
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
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const allResults = [...localResults, ...jishoResults.filter(j => !localResults.some(l => l.word === j.word))];

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={handleOverlayClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div
                className="animate-slide-up"
                style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    maxWidth: '520px',
                    width: '100%',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--color-bg-tertiary)',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--color-bg-secondary)',
                }}>
                    <div>
                        <h3 className="font-bold text-base" style={{ margin: 0 }}>
                            Add Word for <span className="font-japanese font-bold" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>{kanjiCharacter}</span>
                        </h3>
                        <p className="text-xs text-secondary" style={{ margin: '2px 0 0 0' }}>
                            Select or search for a word to link ({currentExamples.length}/3 used)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px', borderRadius: '50%', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-bg-tertiary)', backgroundColor: 'var(--color-bg-card)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-tertiary)',
                                    pointerEvents: 'none',
                                }}
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setSearchedJisho(false); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleJishoSearch(); }}
                                placeholder={`Search words with ${kanjiCharacter}...`}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-2) var(--space-3) var(--space-2) 34px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                            {query && (
                                <button
                                    onClick={() => { setQuery(''); setSearchedJisho(false); }}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-text-tertiary)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleJishoSearch}
                            disabled={loadingJisho || !query.trim()}
                            className="btn btn-secondary"
                            style={{
                                padding: '0 var(--space-3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                            }}
                            title="Search Jisho online dictionary"
                        >
                            {loadingJisho ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    <Globe size={14} />
                                    <span>Jisho</span>
                                </>
                            )}
                        </button>
                    </div>
                    {!searchedJisho && query.trim() && (
                        <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-1)', marginBottom: 0 }}>
                            Press Enter or tap <strong>Jisho</strong> to search the online dictionary
                        </p>
                    )}
                </div>

                {/* Results List */}
                <div
                    style={{
                        overflowY: 'auto',
                        flex: 1,
                        padding: 'var(--space-3) var(--space-4)',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {allResults.length === 0 && !loadingJisho && (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-tertiary)' }}>
                            <Search size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                            <p style={{ margin: 0, fontWeight: 500 }}>
                                {query
                                    ? `No local matches found for "${query}". Try searching Jisho above.`
                                    : `No vocabulary words found containing ${kanjiCharacter}. Try typing a query.`}
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {allResults.map((result, i) => (
                            <button
                                key={`${result.source}-${result.word}-${i}`}
                                onClick={() => handleAdd(result)}
                                disabled={result.alreadyLinked}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: result.alreadyLinked ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                                    cursor: result.alreadyLinked ? 'default' : 'pointer',
                                    opacity: result.alreadyLinked ? 0.55 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                        <span className="font-japanese font-bold" style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                                            {result.word}
                                        </span>
                                        <span className="font-japanese text-sm text-secondary">
                                            {result.reading}
                                        </span>
                                        {result.jlptLevel && (
                                            <span
                                                className={`jlpt-badge jlpt-n${result.jlptLevel}`}
                                                style={{
                                                    fontSize: '0.65rem',
                                                    padding: '1px 5px',
                                                    fontWeight: 'bold',
                                                    lineHeight: '1.4',
                                                }}
                                            >
                                                N{result.jlptLevel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-tertiary truncate" style={{ marginTop: '3px' }}>
                                        {result.meaning}
                                    </div>
                                </div>

                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    {result.source === 'custom' && (
                                        <span style={{
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
                                        <span style={{
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
                                    {result.alreadyLinked ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-tertiary)',
                                            }}
                                        >
                                            <Check size={16} />
                                            <span>Added</span>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-primary)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Plus size={16} />
                                            <span>Add</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {loadingJisho && (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-tertiary)' }}>
                            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                            <p className="text-xs">Searching Jisho...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

