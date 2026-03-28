import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Paragraph } from '@toss/tds-mobile';
import { StorageSessionProvider } from '@/lib/state/StorageSessionContext';
import HomePage from '@/pages/HomePage';
import SimulatePage from '@/pages/SimulatePage';
import ResultPage from '@/pages/ResultPage';
import SharePage from '@/pages/SharePage';
import HistoryPage from '@/pages/HistoryPage';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '입력', path: '/simulate' },
  { label: '히스토리', path: '/history' },
] as const;

function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'var(--tds-color-background)',
        borderTop: '1px solid var(--tds-color-grey100)',
        zIndex: 100,
      }}
    >
      <nav
        role="tablist"
        data-testid="tabbar"
        style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}
      >
        {TAB_ITEMS.map((tab) => {
          const isSelected = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={isSelected}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isSelected
                  ? 'var(--tds-color-primary)'
                  : 'var(--tds-color-grey500)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Paragraph.Text typography="st13">{tab.label}</Paragraph.Text>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StorageSessionProvider>
      <div style={{ paddingBottom: 'calc(48px + 12px + env(safe-area-inset-bottom))' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/simulate" element={<SimulatePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
      <BottomTabBar />
    </StorageSessionProvider>
  );
}
