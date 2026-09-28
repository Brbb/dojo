import { useStudy } from '../context/StudyContext';

export function FastPassTag({ cardIds, compact = false }: { cardIds: string[]; compact?: boolean }) {
    const { isFastPass, setFastPass } = useStudy();
    const enabled = cardIds.some(isFastPass);

    return (
        <button
            type="button"
            className={`fast-pass-tag ${compact ? 'compact' : ''} ${enabled ? 'active' : 'add-fast-pass'}`}
            aria-pressed={enabled}
            aria-label={enabled ? 'Remove from Fast Pass' : 'Add to Fast Pass'}
            title={enabled ? 'Remove from Fast Pass' : 'Tag for Fast Pass exam preparation'}
            onClick={event => {
                event.stopPropagation();
                setFastPass(cardIds, !enabled);
            }}
        >
            {enabled ? '✓ Fast Pass' : '+ Add to Fast Pass'}
        </button>
    );
}
