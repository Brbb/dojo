import { useMemo } from 'react';
import { useStudy } from '../context/StudyContext';

interface ActivityDay {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
    weeks?: number;
}

export function ActivityHeatmap({ weeks = 12 }: ActivityHeatmapProps) {
    const { state } = useStudy();

    // Generate activity data from SRS cards
    const activityData = useMemo(() => {
        const today = new Date();
        const data: Map<string, number> = new Map();

        // Count reviews from SRS cards by their lastReview date
        Object.values(state.srsCards).forEach((card) => {
            if (card.lastReview) {
                const date = new Date(card.lastReview).toISOString().split('T')[0];
                data.set(date, (data.get(date) || 0) + 1);
            }
        });

        // Generate grid data for the specified weeks
        const days: ActivityDay[] = [];
        const totalDays = weeks * 7;

        for (let i = totalDays - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = data.get(dateStr) || 0;

            // Calculate level (0-4) based on activity
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (count > 0) level = 1;
            if (count >= 5) level = 2;
            if (count >= 10) level = 3;
            if (count >= 20) level = 4;

            days.push({ date: dateStr, count, level });
        }

        return days;
    }, [state.srsCards, weeks]);

    // Get month labels
    const monthLabels = useMemo(() => {
        const labels: { month: string; index: number }[] = [];
        let lastMonth = -1;

        activityData.forEach((day, index) => {
            const date = new Date(day.date);
            const month = date.getMonth();
            if (month !== lastMonth && index % 7 === 0) {
                labels.push({
                    month: date.toLocaleDateString('en-US', { month: 'short' }),
                    index: Math.floor(index / 7),
                });
                lastMonth = month;
            }
        });

        return labels;
    }, [activityData]);

    // Organize into weeks (columns)
    const weeksData = useMemo(() => {
        const result: ActivityDay[][] = [];
        for (let i = 0; i < activityData.length; i += 7) {
            result.push(activityData.slice(i, i + 7));
        }
        return result;
    }, [activityData]);

    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    return (
        <div className="activity-heatmap">
            <div className="heatmap-header">
                <span className="heatmap-title">Study Activity</span>
                <span className="heatmap-subtitle">
                    {activityData.filter((d) => d.count > 0).length} active days
                </span>
            </div>

            <div className="heatmap-container">
                {/* Day labels */}
                <div className="heatmap-day-labels">
                    {dayLabels.map((label, i) => (
                        <span key={i} className="day-label">
                            {label}
                        </span>
                    ))}
                </div>

                {/* Grid */}
                <div className="heatmap-grid-wrapper">
                    {/* Month labels */}
                    <div className="heatmap-month-labels">
                        {monthLabels.map((label, i) => (
                            <span
                                key={i}
                                className="month-label"
                                style={{ gridColumn: label.index + 1 }}
                            >
                                {label.month}
                            </span>
                        ))}
                    </div>

                    {/* Activity grid */}
                    <div
                        className="heatmap-grid"
                        style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
                    >
                        {weeksData.map((week, weekIndex) =>
                            week.map((day, dayIndex) => (
                                <div
                                    key={`${weekIndex}-${dayIndex}`}
                                    className={`heatmap-cell level-${day.level}`}
                                    title={`${day.date}: ${day.count} cards reviewed`}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="heatmap-legend">
                <span className="legend-label">Less</span>
                <div className="heatmap-cell level-0" />
                <div className="heatmap-cell level-1" />
                <div className="heatmap-cell level-2" />
                <div className="heatmap-cell level-3" />
                <div className="heatmap-cell level-4" />
                <span className="legend-label">More</span>
            </div>
        </div>
    );
}
