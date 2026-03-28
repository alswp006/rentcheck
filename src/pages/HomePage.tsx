import { useNavigate } from 'react-router-dom';
import { Button, ListRow, Paragraph, Spacing, Top, Border } from '@toss/tds-mobile';
import { presetService } from '@/lib/presetService';
import { useHistory } from '@/hooks/useHistory';
import type { HistoryEntry } from '@/lib/types';

const MAX_HISTORY_PREVIEW = 3;

const PRESET_SUBTITLES: Record<string, string> = {
  'preset-gangnam-jeonse': '강남권 고가 전세·매매 5년 비교',
  'preset-gyeonggi-monthly': '수도권 월세·전세 7년 비교',
  'preset-seoul-buy': '서울 매매 10년 장기 시나리오',
  'preset-affordable': '지방 실속형 5년 비교',
};

function safeHapticTickWeak(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fw = require('@apps-in-toss/framework') as {
      generateHapticFeedback?: (o: { type: string }) => void;
    };
    fw.generateHapticFeedback?.({ type: 'tickWeak' });
  } catch {
    // Not in Toss app environment — no-op
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { loading, items, error } = useHistory();

  const presets = presetService.listPresets().items;

  const sortedHistory = [...items]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_HISTORY_PREVIEW);

  function handlePresetClick(presetId: string): void {
    safeHapticTickWeak();
    navigate('/input', { state: { presetId } });
  }

  function handleHistoryClick(entry: HistoryEntry): void {
    safeHapticTickWeak();
    navigate('/result', { state: { input: entry.input, historyId: entry.id } });
  }

  function handleStartInput(): void {
    navigate('/input', { state: { presetId: null } });
  }

  function handleViewAll(): void {
    navigate('/history');
  }

  return (
    <div>
      <Top title="전세·월세·매매 비교" />

      <Spacing size={16} />

      <Paragraph.Text typography="t3">프리셋으로 시작</Paragraph.Text>
      <Spacing size={8} />

      {presets.map((preset) => (
        <ListRow key={preset.id} onClick={() => handlePresetClick(preset.id)}>
          <ListRow.Texts
            type="2RowTypeA"
            top={preset.name}
            bottom={PRESET_SUBTITLES[preset.id] ?? '시나리오 비교'}
          />
        </ListRow>
      ))}

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <Paragraph.Text typography="t3">최근 비교</Paragraph.Text>
      <Spacing size={8} />

      {loading && (
        <Paragraph.Text typography="st6">불러오고 있어요</Paragraph.Text>
      )}

      {!loading && error && (
        <Paragraph.Text typography="st6">불러오기에 실패했어요</Paragraph.Text>
      )}

      {!loading && !error && sortedHistory.length === 0 && (
        <div>
          <Paragraph.Text typography="st6">아직 저장된 결과가 없어요</Paragraph.Text>
          <Spacing size={12} />
          <Button size="large" variant="fill" color="primary" onClick={handleStartInput}>
            입력 시작할게요
          </Button>
        </div>
      )}

      {!loading && !error && sortedHistory.length > 0 && (
        <div>
          {sortedHistory.map((entry) => (
            <ListRow key={entry.id} onClick={() => handleHistoryClick(entry)}>
              <ListRow.Text>{entry.label}</ListRow.Text>
            </ListRow>
          ))}
          <Spacing size={12} />
          <Button size="large" variant="weak" color="primary" onClick={handleViewAll}>
            전체 보기
          </Button>
        </div>
      )}
    </div>
  );
}
