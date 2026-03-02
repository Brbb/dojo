import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { ReviewPage } from './pages/ReviewPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { BrowsePage } from './pages/BrowsePage';
import { ReadPage } from './pages/ReadPage';
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
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/read" element={<ReadPage />} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </StudyProvider>
  );
}

export default App;
