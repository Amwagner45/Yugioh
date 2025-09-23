import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/common/Navigation';
import HomePage from './pages/HomePage';
import BinderPage from './pages/BinderPage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import BanlistManagerPage from './pages/BanlistManagerPage';
import BanlistBuilderPage from './pages/BanlistBuilderPage';
import './App.css';

function App() {
  useEffect(() => {
    // Simple cursor enforcement - no complex utilities
    const enforceCursor = () => {
      document.body.style.cursor = "url('/yugioh-cursor.png'), auto";
      document.documentElement.style.cursor = "url('/yugioh-cursor.png'), auto";
    };

    enforceCursor();

    // Re-enforce periodically to handle any overrides
    const interval = setInterval(enforceCursor, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/binder" element={<BinderPage />} />
              <Route path="/deck-builder" element={<DeckBuilderPage />} />
              <Route path="/banlist-manager" element={<BanlistManagerPage />} />
              <Route path="/banlist-builder" element={<BanlistBuilderPage />} />
              <Route path="/banlist-builder/:banlistId" element={<BanlistBuilderPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
