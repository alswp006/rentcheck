import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SimulatePage from './pages/SimulatePage';
import ResultPage from './pages/ResultPage';
import SharePage from './pages/SharePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/simulate" element={<SimulatePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/share" element={<SharePage />} />
    </Routes>
  );
}
