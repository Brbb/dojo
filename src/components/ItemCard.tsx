import { Fragment } from 'react';
import type { Kanji, Vocabulary, CardType, Mnemonic } from '../types';
import { ReadingDisplay } from './ReadingDisplay';

interface ItemCardProps {
    type: CardType;
    item: Kanji | Vocabulary;
    mnemonic?: Mnemonic | null;
    compact?: boolean;
}

export function ItemCard({ type, item, mnemonic, compact = false }: ItemCardProps) {
    const isKanji = type === 'kanji';
    // Type guards/casting for specific properties
    const kanjiItem = isKanji ? (item as Kanji) : null;
    const vocabItem = !isKanji ? (item as Vocabulary) : null;

    if (compact) {
        return (
            <div style={{ padding: 'var(--space-4)' }}>
                {/* Compact Header: Kanji Left, Metadata Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', gap: 'var(--space-4)' }}>
                    <div style={{ flexShrink: 0 }}>
                        <div
                            className="font-japanese"
                            style={{
                                fontSize: isKanji ? '3.5rem' : '2rem',
                                color: 'var(--color-text-primary)',
                                lineHeight: 1
                            }}
                        >
                            {isKanji ? kanjiItem?.character : vocabItem?.word}
                        </div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <span
                                className={`jlpt-badge jlpt-n${item.jlptLevel}`}
                                style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                                N{item.jlptLevel}
                            </span>
                            {isKanji && kanjiItem && kanjiItem.frequency && kanjiItem.frequency < 9999 && (
                                <span
                                    className="jlpt-badge"
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    #{kanjiItem.frequency}
                                </span>
                            )}
                        </div>

                        <div className="text-lg font-bold text-primary" style={{ lineHeight: 1.2 }}>
                            {item.meaning.join(', ')}
                        </div>

                        {isKanji && kanjiItem && (
                            <div className="text-xs text-text-tertiary" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                {kanjiItem.onyomi.length > 0 && <span>On: {kanjiItem.onyomi.join(', ')}</span>}
                                {kanjiItem.kunyomi.length > 0 && (
                                    <span>Kun: {kanjiItem.kunyomi.map((r, i) => (
                                        <Fragment key={i}>
                                            <ReadingDisplay reading={r} />
                                            {i < kanjiItem.kunyomi.length - 1 && ', '}
                                        </Fragment>
                                    ))}</span>
                                )}
                            </div>
                        )}

                        {!isKanji && vocabItem && (
                            <div className="text-sm font-japanese text-text-secondary">
                                {vocabItem.reading}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Examples Section */}
                    {((isKanji && kanjiItem?.examples) || (!isKanji && vocabItem?.examples)) && (
                        <div>
                            <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Examples</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {isKanji && kanjiItem?.examples?.map((ex, i) => (
                                    <div key={i} style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="font-japanese font-bold" style={{ fontSize: '0.9rem' }}>{ex.word}</div>
                                            <div className="text-xs text-secondary">{ex.reading}</div>
                                        </div>
                                        <div className="text-xs text-right font-medium" style={{ flexShrink: 0 }}>{ex.meaning}</div>
                                    </div>
                                ))}
                                {!isKanji && vocabItem?.examples?.map((ex, i) => (
                                    <div key={i} style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <div className="font-japanese font-bold" style={{ minWidth: 0, fontSize: '0.85rem' }}>{ex.sentence}</div>
                                        <div className="text-xs text-secondary text-right font-medium" style={{ flexShrink: 0, maxWidth: '40%' }}>{ex.translation}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}



                    {/* Mnemonic (StudyCard support) */}
                    {mnemonic && (
                        <div style={{
                            padding: 'var(--space-3)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(217, 119, 87, 0.2)'
                        }}>
                            <h3 className="text-primary text-xs uppercase tracking-wider mb-1">Your Mnemonic</h3>
                            <p className="text-sm text-text-primary italic">"{mnemonic.text}"</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem' }}>

            {/* Main Character Display */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                    className="font-japanese"
                    style={{
                        fontSize: isKanji ? '5rem' : '2.5rem',
                        color: 'var(--color-text-primary)',
                        marginBottom: '0.5rem'
                    }}
                >
                    {isKanji ? kanjiItem?.character : vocabItem?.word}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            backgroundColor: `var(--color-n${item.jlptLevel})`,
                            color: 'white'
                        }}
                    >
                        N{item.jlptLevel}
                    </span>
                    {isKanji && kanjiItem && kanjiItem.frequency && kanjiItem.frequency < 9999 && (
                        <span
                            style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)'
                            }}
                            title="Frequency Rank"
                        >
                            #{kanjiItem.frequency}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Meanings */}
                <div>
                    <h3 className="section-title text-secondary text-xs uppercase tracking-wider mb-2">Meaning</h3>
                    <div className="text-xl font-bold text-primary">
                        {item.meaning.join(', ')}
                    </div>
                </div>

                {/* Kanji Readings */}
                {isKanji && kanjiItem && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">On'yomi</h3>
                            <div className="font-japanese text-lg">
                                {kanjiItem.onyomi.join('、') || '-'}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">Kun'yomi</h3>
                            <div className="font-japanese text-lg">
                                {kanjiItem.kunyomi.length > 0 ? kanjiItem.kunyomi.map((r, i) => (
                                    <Fragment key={i}>
                                        <ReadingDisplay reading={r} />
                                        {i < kanjiItem.kunyomi.length - 1 && '、'}
                                    </Fragment>
                                )) : '-'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Vocabulary Reading */}
                {!isKanji && vocabItem && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-2">Reading</h3>
                        <div className="font-japanese text-xl">
                            {vocabItem.reading}
                        </div>
                    </div>
                )}



                {/* Examples */}
                {isKanji && kanjiItem?.examples && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-3">Examples</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {kanjiItem.examples.map((ex, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="font-japanese font-bold mb-1">{ex.word}</div>
                                        <div className="text-xs text-secondary">{ex.reading}</div>
                                    </div>
                                    <div className="text-sm text-right font-medium" style={{ flexShrink: 0 }}>{ex.meaning}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isKanji && vocabItem?.examples && (
                    <div>
                        <h3 className="text-secondary text-xs uppercase tracking-wider mb-3">Examples</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {vocabItem.examples.map((ex, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <div className="font-japanese font-bold" style={{ minWidth: 0, fontSize: '0.95rem' }}>{ex.sentence}</div>
                                    <div className="text-sm text-secondary text-right font-medium" style={{ flexShrink: 0, maxWidth: '40%' }}>{ex.translation}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mnemonic (StudyCard support) */}
                {mnemonic && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(217, 119, 87, 0.2)'
                    }}>
                        <h3 className="text-primary text-xs uppercase tracking-wider mb-2">Your Mnemonic</h3>
                        <p className="text-text-primary italic">"{mnemonic.text}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
