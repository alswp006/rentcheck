import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Top,
  Paragraph,
  ListRow,
  Button,
  Spacing,
  AlertDialog,
  BottomSheet,
} from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { validateResultState } from '@/lib/routing/guards';
import { runSimulation } from '@/lib/simulation/engine';
import { encodeSharePayloadV1 } from '@/lib/share';
import { upsertHistory } from '@/lib/storage/history';
import { useTossLogin } from '@/hooks/useTossLogin';
import type { SimulationInput, HistoryEntry } from '@/lib/types';
import { AdSlot } from '@/components/AdSlot';
import { formatCurrency } from '@/lib/utils';

const OPTION_LABEL: Record<string, string> = {
  jeonse: '전세',
  monthly: '월세',
  buy: '매매',
};

export function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useTossLogin();
  const userId = user?.id ?? 'guest';

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const guardResult = validateResultState(location.state);

  useEffect(() => {
    if (!guardResult.ok) {
      navigate('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!guardResult.ok) {
    return null;
  }

  const input = (location.state as { input: SimulationInput }).input;
  const result = runSimulation(input);
  const recommendedLabel = OPTION_LABEL[result.recommendedOption] ?? result.recommendedOption;

  function handleSave() {
    generateHapticFeedback({ type: 'success' });
    const now = Date.now();
    const entry: HistoryEntry = {
      id: now.toString(16),
      createdAt: now,
      updatedAt: now,
      label: result.insightCopy.substring(0, 60),
      input,
      result,
    };
    const saveResult = upsertHistory(userId ?? 'guest', entry);
    if (!saveResult.ok) {
      if (saveResult.errorCode === 'STORAGE_QUOTA_EXCEEDED') {
        setErrorMessage('저장공간이 부족해 히스토리를 저장할 수 없어요');
      } else if (saveResult.errorCode === 'STORAGE_UNAVAILABLE') {
        setErrorMessage('저장소에 접근할 수 없어요. 이 기기에서는 히스토리를 저장할 수 없어요');
      }
    }
  }

  function handleShare() {
    generateHapticFeedback({ type: 'tickWeak' });
    const encoded = encodeSharePayloadV1(input);
    const url = `/share?v=1&input=${encoded}`;
    if (navigator.share) {
      navigator.share({ url });
    } else {
      setShareUrl(url);
      setShowShareSheet(true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Top title={<Top.TitleParagraph>결과</Top.TitleParagraph>} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Spacing size={16} />

        <Paragraph.Text typography="t3">
          {result.insightCopy}
        </Paragraph.Text>

        <Spacing size={8} />

        <ListRow onClick={undefined}>
          <ListRow.Texts
            type="2RowTypeA"
            top="추천 옵션"
            bottom={recommendedLabel}
          />
        </ListRow>

        <ListRow onClick={undefined}>
          <ListRow.Texts
            type="2RowTypeA"
            top="전세 최종 순자산"
            bottom={formatCurrency(result.finalNetWorth.jeonse)}
          />
        </ListRow>

        <ListRow onClick={undefined}>
          <ListRow.Texts
            type="2RowTypeA"
            top="월세 최종 순자산"
            bottom={formatCurrency(result.finalNetWorth.monthly)}
          />
        </ListRow>

        <ListRow onClick={undefined}>
          <ListRow.Texts
            type="2RowTypeA"
            top="매매 최종 순자산"
            bottom={formatCurrency(result.finalNetWorth.buy)}
          />
        </ListRow>

        <Spacing size={16} />

        <Paragraph.Text typography="t4">순자산 흐름</Paragraph.Text>

        <Spacing size={8} />

        {result.netWorthSeries.map((point) => (
          <ListRow key={point.year} onClick={undefined}>
            <ListRow.Texts
              type="1RowTypeA"
              top={`${point.year}년차 — 전세 ${formatCurrency(point.jeonse)} / 월세 ${formatCurrency(point.monthly)} / 매매 ${formatCurrency(point.buy)}`}
            />
          </ListRow>
        ))}

        <Spacing size={24} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
          <Button variant="fill" size="large" onClick={handleSave}>
            히스토리에 저장
          </Button>
          <Button variant="weak" size="large" onClick={handleShare}>
            링크로 공유
          </Button>
        </div>

        <Spacing size={16} />

        <AdSlot slotId="result-bottom" />

        <Spacing size={16} />
      </div>

      <AlertDialog
        open={errorMessage !== null}
        title="저장 실패"
        description={errorMessage ?? ''}
        onClose={() => setErrorMessage(null)}
        alertButton={
          <AlertDialog.AlertButton onClick={() => setErrorMessage(null)}>
            닫기
          </AlertDialog.AlertButton>
        }
      />

      <BottomSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
      >
        <BottomSheet.Header>
          <Paragraph.Text typography="t4">링크로 공유</Paragraph.Text>
        </BottomSheet.Header>
        <Spacing size={16} />
        <div style={{ padding: '0 16px' }}>
          <Paragraph.Text typography="st5">{shareUrl}</Paragraph.Text>
        </div>
        <Spacing size={16} />
        <div style={{ padding: '0 16px' }}>
          <Button
            variant="fill"
            size="large"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
              setShowShareSheet(false);
            }}
          >
            복사하기
          </Button>
        </div>
        <Spacing size={16} />
      </BottomSheet>
    </div>
  );
}

export default ResultPage;
