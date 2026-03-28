import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Top, Spacing, Paragraph, Button } from '@toss/tds-mobile';
import { Link2Off } from 'lucide-react';
import { decodeSharePayloadV1 } from '@/lib/share';

type PageState = 'loading' | 'error';

export default function SharePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<PageState>('loading');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('input');

    if (!encoded) {
      setState('error');
      return;
    }

    const result = decodeSharePayloadV1(encoded);

    if (result.ok) {
      navigate('/simulate', {
        state: { input: result.payload.input, source: 'share' },
        replace: true,
      });
    } else {
      setState('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Top title={<Top.TitleParagraph>공유 링크 확인</Top.TitleParagraph>} />
      {state === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Spacing size={40} />
          <Paragraph.Text typography="t4">입력을 불러오고 있어요</Paragraph.Text>
          <Spacing size={40} />
        </div>
      )}
      {state === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Spacing size={40} />
          <Link2Off size={48} color="var(--tds-color-grey500)" />
          <Spacing size={8} />
          <Paragraph.Text typography="t4">공유 링크가 올바르지 않아요</Paragraph.Text>
          <Spacing size={24} />
          <Button variant="fill" size="large" onClick={() => navigate('/')}>
            홈으로 갈게요
          </Button>
          <Spacing size={40} />
        </div>
      )}
    </div>
  );
}
