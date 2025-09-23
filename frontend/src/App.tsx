import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/common/Navigation';
import HomePage from './pages/HomePage';
import BinderPage from './pages/BinderPage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import './App.css';

function App() {
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
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
