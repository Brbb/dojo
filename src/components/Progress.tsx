interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    children?: React.ReactNode;
}

export function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 8,
    color = 'var(--color-primary)',
    backgroundColor = 'var(--color-bg-tertiary)',
    children,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                className="progress-ring"
                width={size}
                height={size}
            >
                {/* Background circle */}
                <circle
                    stroke={backgroundColor}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress circle */}
                <circle
                    className="progress-ring-circle"
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            {children && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

interface ProgressBarProps {
    progress: number; // 0-100
    height?: number;
    showLabel?: boolean;
}

export function ProgressBar({ progress, height = 6, showLabel = false }: ProgressBarProps) {
    return (
        <div style={{ width: '100%' }}>
            {showLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="text-sm text-secondary">Progress</span>
                    <span className="text-sm text-secondary">{Math.round(progress)}%</span>
                </div>
            )}
            <div className="progress-bar" style={{ height }}>
                <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
        </div>
    );
}
