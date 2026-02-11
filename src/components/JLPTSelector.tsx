import type { JLPTLevel } from '../types';

interface JLPTSelectorProps {
    selectedLevels: JLPTLevel[];
    onChange: (levels: JLPTLevel[]) => void;
    multiple?: boolean;
}

export function JLPTSelector({ selectedLevels, onChange, multiple = true }: JLPTSelectorProps) {
    const levels: JLPTLevel[] = [5, 4, 3, 2, 1];

    const handleToggle = (level: JLPTLevel) => {
        if (multiple) {
            if (selectedLevels.includes(level)) {
                // Don't allow deselecting if it's the only one
                if (selectedLevels.length > 1) {
                    onChange(selectedLevels.filter(l => l !== level));
                }
            } else {
                onChange([...selectedLevels, level].sort((a, b) => b - a));
            }
        } else {
            onChange([level]);
        }
    };

    return (
        <div className="jlpt-selector">
            {levels.map(level => (
                <button
                    key={level}
                    className={`jlpt-toggle n${level} ${selectedLevels.includes(level) ? 'active' : ''}`}
                    onClick={() => handleToggle(level)}
                >
                    N{level}
                </button>
            ))}
        </div>
    );
}

// Simple badge for displaying JLPT level
interface JLPTBadgeProps {
    level: JLPTLevel;
}

export function JLPTBadge({ level }: JLPTBadgeProps) {
    return (
        <span className={`jlpt-badge jlpt-n${level}`}>
            N{level}
        </span>
    );
}
