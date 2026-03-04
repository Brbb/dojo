import { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { allKanji } from '../data/kanji';
import { allVocabulary } from '../data/vocabulary';
import { ArrowLeft, Plus, AlertCircle, CheckCircle2, Search, Loader2, Trash2, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CardType, CustomCard } from '../types';

interface JishoSuggestion {
    reading: string;
    meanings: string[];
    onReading?: string;
    kunReading?: string;
}

export function CustomCardPage() {
    const navigate = useNavigate();
    const { state, addCustomCard, addToReview, deleteCustomCard } = useStudy();

    const [showForm, setShowForm] = useState(false);
    const [type, setType] = useState<CardType>('kanji');
    const [word, setWord] = useState('');
    const [reading, setReading] = useState('');
    const [onReading, setOnReading] = useState('');
    const [kunReading, setKunReading] = useState('');
    const [meaning, setMeaning] = useState('');
    const [isAutoAdd, setIsAutoAdd] = useState(true);
    const [jishoSuggestions, setJishoSuggestions] = useState<JishoSuggestion[]>([]);
    const [loadingJisho, setLoadingJisho] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState<{ id: string, type: CardType } | null>(null);
    const [success, setSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCards = useMemo(() => {
        if (!searchQuery) return state.customCards;
        const q = searchQuery.toLowerCase();
        return state.customCards.filter(card =>
            card.word.toLowerCase().includes(q) ||
            card.meaning.some(m => m.toLowerCase().includes(q)) ||
            (card.reading && card.reading.toLowerCase().includes(q)) ||
            (card.onReading && card.onReading.toLowerCase().includes(q)) ||
            (card.kunReading && card.kunReading.toLowerCase().includes(q))
        );
    }, [state.customCards, searchQuery]);

    // Duplicate detection
    const duplicate = useMemo(() => {
        if (!word) return null;
        if (type === 'kanji') {
            const found = allKanji.find(k => k.character === word);
            return found ? { id: found.id, type: 'kanji' as CardType } : null;
        } else {
            const found = allVocabulary.find(v => v.word === word);
            return found ? { id: found.id, type: 'vocabulary' as CardType } : null;
        }
    }, [word, type]);

    const isKatakana = (text: string) => /[\u30A0-\u30FF]/.test(text);

    const fetchFromKanjiApi = async (char: string) => {
        try {
            const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`);
            if (!response.ok) throw new Error('Kanji not found');
            const data = await response.json();

            const suggestion: JishoSuggestion = {
                reading: data.kun_readings[0] || data.on_readings[0] || '',
                meanings: data.meanings,
                onReading: data.on_readings.join(', '),
                kunReading: data.kun_readings.join(', ')
            };

            setJishoSuggestions([suggestion]);

            // Auto-fill if fields are empty
            if (!reading) setReading(suggestion.reading);
            if (!onReading) setOnReading(suggestion.onReading || '');
            if (!kunReading) setKunReading(suggestion.kunReading || '');
            if (!meaning) setMeaning(suggestion.meanings.join(', '));
        } catch (err) {
            console.error('Error fetching from KanjiAPI:', err);
        }
    };

    const handleFetchData = async () => {
        if (!word) return;
        setLoadingJisho(true);
        setJishoSuggestions([]);

        if (type === 'kanji' && word.length === 1) {
            await fetchFromKanjiApi(word);
            setLoadingJisho(false);
            return;
        }

        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;
            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const suggestions: JishoSuggestion[] = data.data.slice(0, 3).map((item: any) => {
                    const mainReading = item.japanese[0].reading;
                    const readings = item.japanese.map((j: any) => j.reading);

                    let on: string[] = [];
                    let kun: string[] = [];

                    if (type === 'kanji') {
                        // Heuristic separation
                        readings.forEach((r: string) => {
                            if (isKatakana(r)) on.push(r);
                            else kun.push(r);
                        });
                    }

                    return {
                        reading: mainReading,
                        meanings: item.senses[0].english_definitions,
                        onReading: on.length > 0 ? on.join(', ') : undefined,
                        kunReading: kun.length > 0 ? kun.join(', ') : undefined
                    };
                });
                setJishoSuggestions(suggestions);

                // Auto-fill top suggestion if fields are empty
                const top = suggestions[0];
                if (!reading) setReading(top.reading);
                if (top.onReading && !onReading) setOnReading(top.onReading);
                if (top.kunReading && !kunReading) setKunReading(top.kunReading);
                if (!meaning) setMeaning(top.meanings.join(', '));
            }
        } catch (err) {
            console.error('Error fetching from Jisho:', err);
        } finally {
            setLoadingJisho(false);
        }
    };

    const applySuggestion = (s: JishoSuggestion) => {
        setReading(s.reading);
        if (s.onReading) setOnReading(s.onReading);
        if (s.kunReading) setKunReading(s.kunReading);
        setMeaning(s.meanings.join(', '));
        setJishoSuggestions([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!word || !meaning) return;

        if (duplicate) {
            setShowDuplicateModal(duplicate);
            return;
        }

        const newId = `custom_${Date.now()}`;
        const newCard: CustomCard = {
            id: newId,
            type: type as 'kanji' | 'vocabulary',
            word,
            reading,
            onReading: type === 'kanji' ? onReading : undefined,
            kunReading: type === 'kanji' ? kunReading : undefined,
            meaning: meaning.split(',').map(s => s.trim()),
            createdAt: Date.now()
        };

        addCustomCard(newCard);

        if (isAutoAdd) {
            addToReview(newId, type);
        }

        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setShowForm(false);
            resetForm();
        }, 1500);
    };

    const handleAddExisting = () => {
        if (showDuplicateModal) {
            addToReview(showDuplicateModal.id, showDuplicateModal.type);
            setSuccess(true);
            setShowDuplicateModal(null);
            setTimeout(() => {
                setSuccess(false);
                setShowForm(false);
                resetForm();
            }, 1500);
        }
    };

    const resetForm = () => {
        setWord('');
        setReading('');
        setOnReading('');
        setKunReading('');
        setMeaning('');
        setJishoSuggestions([]);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this custom item?')) {
            deleteCustomCard(id);
        }
    };

    return (
        <div style={{ padding: 'var(--space-4)', paddingBottom: '5rem', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <button
                    onClick={() => showForm ? setShowForm(false) : navigate('/')}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">{showForm ? 'Add Custom Item' : 'Custom Items'}</h1>
            </div>

            {!showForm ? (
                /* List View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary"
                        style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
                    >
                        <Plus size={20} /> Add New Item
                    </button>

                    {state.customCards.length > 0 && (
                        <input
                            type="text"
                            placeholder="Search custom items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-bg-tertiary)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '0.95rem',
                                width: '100%'
                            }}
                        />
                    )}

                    {state.customCards.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-tertiary)' }}>
                            <Library size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>No custom items added yet.</p>
                        </div>
                    ) : filteredCards.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-tertiary)' }}>
                            <p>No items matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {filteredCards.map(card => (
                                <div key={card.id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: card.type === 'kanji' ? 'var(--color-primary)' : 'var(--color-accent)'
                                    }}>
                                        {card.word.slice(0, 1)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="font-bold">{card.word}</div>
                                        {card.type === 'kanji' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                {card.onReading && (
                                                    <div className="text-sm" style={{ color: 'var(--color-primary)' }}>
                                                        <span className="text-xs text-tertiary" style={{ marginRight: '4px' }}>ON</span>{card.onReading}
                                                    </div>
                                                )}
                                                {card.kunReading && (
                                                    <div className="text-sm" style={{ color: 'var(--color-accent)' }}>
                                                        <span className="text-xs text-tertiary" style={{ marginRight: '4px' }}>KUN</span>{card.kunReading}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-secondary">{card.reading}</div>
                                        )}
                                        <div className="text-xs text-tertiary" style={{ marginTop: '2px' }}>{card.meaning.join(', ')}</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(card.id, e)}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : success ? (
                /* Success View */
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    gap: '1rem'
                }}>
                    <CheckCircle2 size={64} color="var(--color-primary)" />
                    <h2 className="text-xl font-bold">Card Added!</h2>
                    <p className="text-secondary">Returning to list...</p>
                </div>
            ) : (
                /* Creation Form */
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {/* Type Selector */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            type="button"
                            onClick={() => { setType('kanji'); setJishoSuggestions([]); }}
                            className={`btn ${type === 'kanji' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            Kanji
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('vocabulary'); setJishoSuggestions([]); }}
                            className={`btn ${type === 'vocabulary' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            Vocabulary
                        </button>
                    </div>

                    {/* Word Input + Fetch Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <label className="text-sm font-semibold text-secondary">
                            {type === 'kanji' ? 'Kanji Character' : 'Vocabulary Word'}
                        </label>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <input
                                type="text"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                placeholder={type === 'kanji' ? 'e.g. 龍' : 'e.g. 食べる'}
                                required
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    fontSize: '1.25rem',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleFetchData}
                                disabled={loadingJisho || !word}
                                className="btn btn-secondary"
                                style={{ padding: '0 var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {loadingJisho ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Jisho Suggestions */}
                    {jishoSuggestions.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-primary-light)'
                        }}>
                            <div className="text-xs font-bold uppercase tracking-wider text-primary">Suggestions</div>
                            {jishoSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => applySuggestion(s)}
                                    style={{
                                        textAlign: 'left',
                                        padding: 'var(--space-2)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-bg-tertiary)',
                                        backgroundColor: 'var(--color-bg-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div className="font-japanese font-bold text-sm">
                                        {s.reading}
                                        {s.onReading && <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', marginLeft: '8px' }}>[On]</span>}
                                        {s.kunReading && <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem', marginLeft: '4px' }}>[Kun]</span>}
                                    </div>
                                    <div className="text-xs text-secondary truncate">{s.meanings.join(', ')}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {type === 'kanji' ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    <label className="text-xs font-semibold text-tertiary uppercase tracking-wider">On'yomi</label>
                                    <input
                                        type="text"
                                        value={onReading}
                                        onChange={(e) => setOnReading(e.target.value)}
                                        placeholder="Katakana"
                                        style={{
                                            padding: 'var(--space-2)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    <label className="text-xs font-semibold text-tertiary uppercase tracking-wider">Kun'yomi</label>
                                    <input
                                        type="text"
                                        value={kunReading}
                                        onChange={(e) => setKunReading(e.target.value)}
                                        placeholder="Hiragana"
                                        style={{
                                            padding: 'var(--space-2)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-bg-tertiary)',
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <label className="text-sm font-semibold text-secondary">Reading</label>
                            <input
                                type="text"
                                value={reading}
                                onChange={(e) => setReading(e.target.value)}
                                placeholder="e.g. たべる"
                                style={{
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                    )}

                    {/* Meaning Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <label className="text-sm font-semibold text-secondary">Meaning (comma-separated)</label>
                        <input
                            type="text"
                            value={meaning}
                            onChange={(e) => setMeaning(e.target.value)}
                            placeholder="e.g. dragon"
                            required
                            style={{
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-bg-tertiary)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {/* Auto-add Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                        <div
                            onClick={() => setIsAutoAdd(!isAutoAdd)}
                            style={{
                                width: '48px',
                                height: '24px',
                                backgroundColor: isAutoAdd ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                borderRadius: '12px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                left: isAutoAdd ? '26px' : '2px',
                                top: '2px',
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }} />
                        </div>
                        <span className="text-sm text-secondary">Add to review queue immediately</span>
                    </div>

                    <button
                        type="submit"
                        className={`btn ${duplicate ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ marginTop: 'var(--space-2)', padding: '1rem', border: duplicate ? '1px dashed var(--color-primary)' : '' }}
                    >
                        {duplicate ? <AlertCircle size={20} style={{ marginRight: '8px' }} /> : <Plus size={20} style={{ marginRight: '8px' }} />}
                        {duplicate ? 'Item Exists in Library' : 'Create Custom Card'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="btn"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        Cancel
                    </button>
                </form>
            )}

            {/* Duplicate Modal */}
            {showDuplicateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--color-bg-card)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '400px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-xl)'
                    }}>
                        <div style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                            <AlertCircle size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Item Already Exists</h2>
                        <p className="text-secondary mb-6">
                            "{word}" is already in the library. Would you like to add the existing card to your review instead?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <button className="btn btn-primary" onClick={handleAddExisting}>
                                Yes, Add Existing Card
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowDuplicateModal(null);
                                    const newId = `custom_${Date.now()}`;
                                    addCustomCard({
                                        id: newId,
                                        type: type as 'kanji' | 'vocabulary',
                                        word,
                                        reading,
                                        onReading: type === 'kanji' ? onReading : undefined,
                                        kunReading: type === 'kanji' ? kunReading : undefined,
                                        meaning: meaning.split(',').map(s => s.trim()),
                                        createdAt: Date.now()
                                    });
                                    if (isAutoAdd) addToReview(newId, type);
                                    setSuccess(true);
                                    setTimeout(() => {
                                        setSuccess(false);
                                        setShowForm(false);
                                        resetForm();
                                    }, 1500);
                                }}
                            >
                                Add as Custom Anyway
                            </button>
                            <button className="btn" style={{ color: 'var(--color-text-tertiary)' }} onClick={() => setShowDuplicateModal(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
