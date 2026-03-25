import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import SettingsPage from './pages/SettingsPage';
import PremiumPage from './pages/PremiumPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/premium" element={<PremiumPage />} />
    </Routes>
  );
}
