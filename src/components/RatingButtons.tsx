import type { SRSRating } from '../types';

interface RatingButtonsProps {
    onRate: (rating: SRSRating) => void;
    disabled?: boolean;
}

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {

    const ratings: { rating: SRSRating; label: string; className: string }[] = [
        { rating: 'again', label: 'Again', className: 'again' },
        { rating: 'hard', label: 'Hard', className: 'hard' },
        { rating: 'good', label: 'Good', className: 'good' },
        { rating: 'easy', label: 'Easy', className: 'easy' },
    ];

    return (
        <div className="rating-buttons">
            {ratings.map(({ rating, label, className }) => (
                <button
                    key={rating}
                    className={`btn btn-rating ${className}`}
                    onClick={() => onRate(rating)}
                    disabled={disabled}
                >
                    <span className="rating-label">{label}</span>

                </button>
            ))}
        </div>
    );
}
