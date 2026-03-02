import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { JLPTLevel } from '../types';

type ReadingLevel = Extract<JLPTLevel, 3 | 4>;

interface NewsRow {
    id: number;
    created_at: string;
    N3: string | null;
    N4: string | null;
}

export function ReadPage() {
    const navigate = useNavigate();
    const [level, setLevel] = useState<ReadingLevel>(4);
    const [entries, setEntries] = useState<NewsRow[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<NewsRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchEntries() {
            setLoading(true);
            setError(null);

            try {
                const { data, error: dbError } = await supabase
                    .from('news')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (dbError) throw dbError;
                setEntries((data as NewsRow[]) ?? []);
            } catch (err) {
                console.error('Error fetching entries:', err);
                setError('Failed to load readings.');
            } finally {
                setLoading(false);
            }
        }

        fetchEntries();
    }, []);

    const levels: ReadingLevel[] = [4, 3];

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('ja-JP', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

    const formatDateShort = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
        });

    const getPassage = (entry: NewsRow): string | null => {
        const col = `N${level}` as 'N3' | 'N4';
        return entry[col];
    };

    const getPreview = (entry: NewsRow): string => {
        const text = getPassage(entry);
        if (!text) return 'No passage available';
        return text.length > 60 ? text.slice(0, 60) + '…' : text;
    };

    // Detail view
    if (selectedEntry) {
        const passage = getPassage(selectedEntry);

        return (
            <div className="page container" style={{ paddingBottom: 'calc(var(--nav-height) + var(--space-12) + var(--safe-bottom))' }}>
                <header className="mb-6 flex items-center gap-4">
                    <button
                        onClick={() => setSelectedEntry(null)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.5rem' }}
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Daily Reading</h1>
                        <p className="text-sm text-tertiary">{formatDate(selectedEntry.created_at)}</p>
                    </div>
                </header>

                {/* Level Selector */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${levels.length}, 1fr)`,
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-6)',
                    background: 'var(--color-bg-secondary)',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-bg-tertiary)'
                }}>
                    {levels.map((l) => (
                        <button
                            key={l}
                            onClick={() => setLevel(l)}
                            style={{
                                padding: 'var(--space-3) var(--space-4)',
                                borderRadius: 'var(--radius-lg)',
                                border: 'none',
                                background: level === l ? 'var(--color-primary)' : 'transparent',
                                color: level === l ? 'white' : 'var(--color-text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                fontSize: 'var(--text-sm)',
                                boxShadow: level === l ? '0 4px 12px rgba(217, 119, 87, 0.2)' : 'none'
                            }}
                        >
                            N{l}
                        </button>
                    ))}
                </div>

                {passage ? (
                    <article
                        className="card"
                        style={{
                            padding: 'var(--space-6)',
                            lineHeight: 2,
                            fontSize: 'var(--text-lg)',
                            fontFamily: 'var(--font-japanese)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {passage}
                    </article>
                ) : (
                    <div className="card" style={{
                        textAlign: 'center',
                        padding: 'var(--space-8)',
                        color: 'var(--color-text-tertiary)'
                    }}>
                        <p className="font-medium">No N{level} passage for this date.</p>
                    </div>
                )}
            </div>
        );
    }

    // List view
    return (
        <div className="page container" style={{ paddingBottom: 'calc(var(--nav-height) + var(--space-12) + var(--safe-bottom))' }}>
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.5rem' }}
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold">Daily Reading</h1>
            </header>

            {/* Level Selector */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${levels.length}, 1fr)`,
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-6)',
                background: 'var(--color-bg-secondary)',
                padding: 'var(--space-1)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-bg-tertiary)'
            }}>
                {levels.map((l) => (
                    <button
                        key={l}
                        onClick={() => setLevel(l)}
                        style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-lg)',
                            border: 'none',
                            background: level === l ? 'var(--color-primary)' : 'transparent',
                            color: level === l ? 'white' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: 'var(--text-sm)',
                            boxShadow: level === l ? '0 4px 12px rgba(217, 119, 87, 0.2)' : 'none'
                        }}
                    >
                        N{l}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid var(--color-bg-tertiary)',
                        borderTopColor: 'var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                </div>
            ) : error ? (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: 'var(--space-8)',
                    color: 'var(--color-error)'
                }}>
                    <p>{error}</p>
                </div>
            ) : entries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {entries.map((entry, idx) => {
                        const hasPassage = getPassage(entry) !== null;
                        return (
                            <button
                                key={entry.id}
                                onClick={() => hasPassage && setSelectedEntry(entry)}
                                className="card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                    padding: 'var(--space-4) var(--space-5)',
                                    textAlign: 'left',
                                    cursor: hasPassage ? 'pointer' : 'default',
                                    opacity: hasPassage ? 1 : 0.5,
                                    border: idx === 0 ? '1.5px solid var(--color-primary)' : undefined,
                                }}
                            >
                                <div style={{
                                    minWidth: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: idx === 0 ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                    color: idx === 0 ? 'white' : 'var(--color-text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: 'var(--font-japanese)',
                                    fontSize: 'var(--text-xl)',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}>
                                    {new Date(entry.created_at).getDate()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-1)',
                                    }}>
                                        <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                            {formatDateShort(entry.created_at)}
                                        </span>
                                        {idx === 0 && (
                                            <span style={{
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 600,
                                                color: 'var(--color-primary)',
                                                background: 'rgba(217, 119, 87, 0.1)',
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-full)',
                                            }}>
                                                Today
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-tertiary" style={{
                                        fontFamily: 'var(--font-japanese)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {getPreview(entry)}
                                    </p>
                                </div>
                                <div style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>→</div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="card" style={{
                    textAlign: 'center',
                    padding: 'var(--space-8)',
                    color: 'var(--color-text-tertiary)'
                }}>
                    <p style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>📰</p>
                    <p className="font-medium">No readings available yet</p>
                    <p className="text-sm" style={{ marginTop: 'var(--space-2)' }}>
                        Check back later for new passages.
                    </p>
                </div>
            )}
        </div>
    );
}
