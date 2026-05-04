import { ItemCard } from './ItemCard';
import type { Kanji, Vocabulary, CardType } from '../types';
import { useStudy } from '../context/StudyContext';

interface ItemDetailModalProps {
    type: CardType;
    item: Kanji | Vocabulary | null;
    onClose: () => void;
    onNavigate?: (type: CardType, item: Kanji | Vocabulary) => void;
}

export function ItemDetailModal({ type, item, onClose, onNavigate }: ItemDetailModalProps) {
    const { state, addToReview, removeFromReview } = useStudy();

    if (!item) return null;

    const isAlreadyInReview = !!state.srsCards[item.id];

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAddToReview = () => {
        addToReview(item.id, type);
    };

    const handleRemoveFromReview = () => {
        removeFromReview(item.id);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backdropFilter: 'blur(4px)'
            }}
            onClick={handleOverlayClick}
        >
            <div
                className="animate-slide-up"
                style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    maxWidth: '400px',
                    width: '100%',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-xl)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderBottom: '1px solid var(--color-bg-tertiary)',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--color-bg-card)',
                    zIndex: 1
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <ItemCard type={type} item={item} onNavigate={onNavigate} />
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--color-bg-tertiary)',
                    backgroundColor: 'var(--color-bg-card)',
                    position: 'sticky',
                    bottom: 0
                }}>
                    {isAlreadyInReview ? (
                        <button
                            className="btn btn-secondary w-full"
                            onClick={handleRemoveFromReview}
                            style={{
                                width: '100%',
                                color: 'var(--color-error, #c0392b)',
                                borderColor: 'var(--color-error, #c0392b)',
                            }}
                        >
                            Remove from Review
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary w-full"
                            onClick={handleAddToReview}
                            style={{ width: '100%' }}
                        >
                            Add to Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
