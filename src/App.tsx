import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import SettingsPage from './pages/SettingsPage';
import PremiumPage from './pages/PremiumPage';
import { useTossLogin } from './hooks/useTossLogin';

function PrivateRoute({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user, login, loading } = useTossLogin();

  useEffect(() => {
    if (!loading && user == null) {
      login();
    }
  }, [loading, user, login]);

  if (user == null) return <></>;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/premium" element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
    </Routes>
  );
}
