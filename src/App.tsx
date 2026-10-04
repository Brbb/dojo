import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { ReviewPage } from './pages/ReviewPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { BrowsePage } from './pages/BrowsePage';
import { CustomCardPage } from './pages/CustomCardPage.tsx';
import './index.css';

function App() {
  return (
    <StudyProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/browse" element={<BrowsePage key="library" />} />
            <Route path="/fast-pass" element={<BrowsePage key="fast-pass" fastPass />} />
            <Route path="/read" element={<Navigate to="/" replace />} />
            <Route path="/custom-cards" element={<CustomCardPage />} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </StudyProvider>
  );
}

export default App;
