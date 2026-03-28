import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SimulatePage from './pages/SimulatePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/simulate" element={<SimulatePage />} />
    </Routes>
  );
}
