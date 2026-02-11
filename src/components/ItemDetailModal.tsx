import { ItemCard } from './ItemCard';
import type { Kanji, Vocabulary, CardType } from '../types';

interface ItemDetailModalProps {
    type: CardType;
    item: Kanji | Vocabulary | null;
    onClose: () => void;
}

export function ItemDetailModal({ type, item, onClose }: ItemDetailModalProps) {
    if (!item) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
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
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderBottom: '1px solid var(--color-bg-tertiary)'
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
                <ItemCard type={type} item={item} />
            </div>
        </div>
    );
}
