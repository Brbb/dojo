import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MnemonicEditorProps {
    cardId: string;
    initialText?: string;
    onSave: (text: string) => void;
}

export function MnemonicEditor({ cardId, initialText = '', onSave }: MnemonicEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [text, setText] = useState(initialText);

    useEffect(() => {
        setText(initialText);
        setIsEditing(false);
        setIsVisible(false);
    }, [cardId, initialText]);

    const handleSave = () => {
        onSave(text);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setText(initialText);
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <div className="mnemonic-container">
                <div className="mnemonic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="mnemonic-title">💡 Your Mnemonic</span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsVisible(!isVisible)}
                            style={{ padding: '4px', height: 'auto', minHeight: 'auto' }}
                        >
                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {isVisible && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                            {text ? 'Edit' : 'Add'}
                        </button>
                    )}
                </div>
                {isVisible && (
                    text ? (
                        <p className="mnemonic-text">{text}</p>
                    ) : (
                        <p className="mnemonic-placeholder">
                            Create a personal memory trick to remember this better...
                        </p>
                    )
                )}
            </div>
        );
    }

    return (
        <div className="mnemonic-container">
            <div className="mnemonic-header">
                <span className="mnemonic-title">💡 Your Mnemonic</span>
            </div>
            <textarea
                className="input textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your memory trick here..."
                rows={3}
                autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                    Save
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
