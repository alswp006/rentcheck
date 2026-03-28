import { useState, useCallback, useEffect } from 'react';

const isTossApp = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Toss;

interface TossAdOptions {
  /** 광고 슬롯 ID */
  slotId: string;
  /** 광고가 보일 최소 시간(ms) */
  minDisplayTime?: number;
}

export function useTossAd({ slotId, minDisplayTime = 3000 }: TossAdOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [reward, setReward] = useState(false);

  useEffect(() => {
    // 앱인토스 환경에서만 광고 SDK 초기화
    if (isTossApp) {
      setIsReady(true);
    }
  }, [slotId]);

  const show = useCallback(async () => {
    if (!isTossApp) {
      // 개발 환경: 시뮬레이션
      setIsShowing(true);
      await new Promise(r => setTimeout(r, minDisplayTime));
      setIsShowing(false);
      setReward(true);
      return;
    }
    try {
      setIsShowing(true);
      const toss = (window as unknown as Record<string, { showAd: (opts: { slotId: string }) => Promise<{ rewarded: boolean }> }>).Toss;
      const result = await toss.showAd({ slotId });
      setReward(result.rewarded);
    } catch (e) {
      console.error('Toss ad error:', e);
    } finally {
      setIsShowing(false);
    }
  }, [slotId, minDisplayTime]);

  return { isReady, isShowing, reward, show };
}
