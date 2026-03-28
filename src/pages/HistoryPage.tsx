import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Top,
  Button,
  ListRow,
  Paragraph,
  Spacing,
  AlertDialog,
  Toast,
} from '@toss/tds-mobile';
import { History } from 'lucide-react';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useTossLogin } from '@/hooks/useTossLogin';
import { readHistory, deleteAllHistory } from '@/lib/storage/history';
import type { HistoryEntry } from '@/lib/types';

type PageState =
  | { status: 'ok'; items: HistoryEntry[] }
  | { status: 'error' };

function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useTossLogin();
  const userId = user?.id ?? 'guest';

  const loadHistory = useCallback((): PageState => {
    const result = readHistory(userId ?? 'guest');
    if (result.ok) {
      return { status: 'ok', items: result.value };
    }
    return { status: 'error' };
  }, [userId]);

  const [pageState, setPageState] = useState<PageState>(() => loadHistory());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const handleEntryClick = (entry: HistoryEntry) => {
    generateHapticFeedback({ type: 'tickWeak' });
    navigate('/result', {
      state: {
        input: entry.input,
        label: entry.label,
        source: 'history',
      },
    });
  };

  const handleDeleteAll = () => {
    generateHapticFeedback({ type: 'tickWeak' });
    deleteAllHistory(userId ?? 'guest');
    setPageState({ status: 'ok', items: [] });
  };

  const items = pageState.status === 'ok' ? pageState.items : [];
  const hasError = pageState.status === 'error';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Top title={<Top.TitleParagraph>히스토리</Top.TitleParagraph>} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {hasError ? (
          <>
            <Spacing size={24} />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Paragraph.Text typography="st1">히스토리를 불러올 수 없어요</Paragraph.Text>
            </div>
          </>
        ) : items.length === 0 ? (
          <>
            <Spacing size={60} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <History size={48} color="var(--tds-color-grey400)" />
              <Paragraph.Text typography="st1">저장된 결과가 없어요</Paragraph.Text>
              <Button variant="fill" size="large" onClick={() => navigate('/simulate')}>
                시뮬레이션 하러 가기
              </Button>
            </div>
          </>
        ) : (
          <>
            <Spacing size={8} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="weak" onClick={handleDeleteAll}>
                전체 삭제
              </Button>
            </div>
            <Spacing size={8} />
            {items.map((entry) => (
              <ListRow key={entry.id} onClick={() => handleEntryClick(entry)}>
                <ListRow.Texts
                  type="2RowTypeA"
                  top={entry.label}
                  bottom={formatDate(entry.createdAt)}
                />
              </ListRow>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
