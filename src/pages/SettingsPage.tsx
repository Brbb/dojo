import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { JLPTSelector } from '../components/JLPTSelector';
import { exportData, importData, clearAllData } from '../utils/storage';

export function SettingsPage() {
    const { state, updateSettings, resetProgress } = useStudy();
    const { settings } = state;
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [importError, setImportError] = useState('');

    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `galactic-shepard-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (importData(content)) {
                window.location.reload();
            } else {
                setImportError('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        clearAllData();
        resetProgress();
        setShowConfirmReset(false);
        window.location.reload();
    };

    return (
        <div className="page container">
            <header style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-secondary">Customize your learning experience</p>
            </header>

            {/* Study Settings */}
            <section style={{ marginBottom: 'var(--space-8)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Study Settings</h2>

                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="label">Daily New Cards</label>
                    <p className="text-sm text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>
                        Maximum new cards to learn per day
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {[10, 20, 30, 50].map(num => (
                            <button
                                key={num}
                                className={`btn ${settings.dailyNewCards === num ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => updateSettings({ dailyNewCards: num })}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <label className="label">Default JLPT Levels</label>
                    <p className="text-sm text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>
                        Levels to study by default
                    </p>
                    <JLPTSelector
                        selectedLevels={settings.selectedLevels}
                        onChange={(levels) => updateSettings({ selectedLevels: levels })}
                    />
                </div>
            </section>

            {/* Data Management */}
            <section style={{ marginBottom: 'var(--space-8)' }}>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Data Management</h2>

                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 className="font-medium" style={{ marginBottom: 'var(--space-2)' }}>Export Data</h3>
                    <p className="text-sm text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>
                        Download a backup of your progress and mnemonics
                    </p>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        Export Backup
                    </button>
                </div>

                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 className="font-medium" style={{ marginBottom: 'var(--space-2)' }}>Import Data</h3>
                    <p className="text-sm text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>
                        Restore from a previous backup
                    </p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                        id="import-input"
                    />
                    <label htmlFor="import-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        Import Backup
                    </label>
                    {importError && (
                        <p className="text-sm" style={{ color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>
                            {importError}
                        </p>
                    )}
                </div>

                <div className="card" style={{ borderColor: 'var(--color-error)' }}>
                    <h3 className="font-medium" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-error)' }}>
                        Reset All Data
                    </h3>
                    <p className="text-sm text-tertiary" style={{ marginBottom: 'var(--space-3)' }}>
                        This will permanently delete all your progress and mnemonics
                    </p>
                    {!showConfirmReset ? (
                        <button
                            className="btn btn-secondary"
                            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                            onClick={() => setShowConfirmReset(true)}
                        >
                            Reset Progress
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                className="btn"
                                style={{ background: 'var(--color-error)', color: 'white' }}
                                onClick={handleReset}
                            >
                                Confirm Reset
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowConfirmReset(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* About */}
            <section>
                <h2 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-4)' }}>About</h2>
                <div className="card">
                    <h3 className="font-medium japanese" style={{ marginBottom: 'var(--space-2)' }}>
                        Galactic Shepard 🚀
                    </h3>
                    <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>
                        A Japanese learning app with spaced repetition flashcards for JLPT preparation.
                    </p>
                    <p className="text-sm text-tertiary">
                        Built with ❤️ for Japanese learners
                    </p>
                </div>
            </section>
        </div>
    );
}
