interface ReadingDisplayProps {
    reading: string;
    className?: string;
}

export function ReadingDisplay({ reading, className }: ReadingDisplayProps) {
    if (!reading.includes('.')) {
        return <span className={className}>{reading}</span>;
    }

    const [root, okurigana] = reading.split('.');

    return (
        <span className={className}>
            {root}
            <span style={{ color: '#8A847A', opacity: 0.8 }}>{okurigana}</span>
        </span>
    );
}
