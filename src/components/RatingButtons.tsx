import type { SRSRating } from '../types';

interface RatingButtonsProps {
    onRate: (rating: SRSRating) => void;
    disabled?: boolean;
}

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {

    const ratings: { rating: SRSRating; label: string; hint: string; className: string; description: string }[] = [
        { rating: 'again', label: 'Again', hint: 'Forgot', className: 'again', description: 'I did not remember this' },
        { rating: 'almost', label: 'Almost', hint: 'Partial', className: 'almost', description: 'I remembered only part of it' },
        { rating: 'easy', label: 'Easy', hint: 'Know it', className: 'easy', description: 'I am sure I know this' },
    ];

    return (
        <div className="rating-buttons">
            {ratings.map(({ rating, label, hint, className, description }) => (
                <button
                    key={rating}
                    className={`btn btn-rating ${className}`}
                    onClick={() => onRate(rating)}
                    disabled={disabled}
                    title={description}
                    aria-label={`${label}: ${description}`}
                >
                    <span className="rating-label">{label}</span>
                    <span className="rating-hint">{hint}</span>
                </button>
            ))}
        </div>
    );
}
