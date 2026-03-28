import { useState } from 'react';
import { useTossAd } from '@/hooks/useTossAd';
import '@/styles/reward-ad.css';

interface TossRewardAdProps {
  /** 광고 슬롯 ID */
  slotId: string;
  /** 광고 시청 완료 후 보여줄 콘텐츠 */
  children: React.ReactNode;
  /** 광고 시청 전 표시할 안내 문구 (기본: "광고를 시청하면 결과를 확인할 수 있어요") */
  description?: string;
  /** 광고 버튼 텍스트 (기본: "광고 보고 확인하기") */
  buttonText?: string;
  /** 광고 시청 완료 콜백 */
  onRewarded?: () => void;
}

/**
 * 보상형 광고 게이트 컴포넌트.
 * 광고 시청 완료 전까지 children을 숨기고, 시청 후 노출합니다.
 *
 * 사용법:
 * ```tsx
 * <TossRewardAd slotId="result-unlock">
 *   <ResultContent data={result} />
 * </TossRewardAd>
 * ```
 */
export function TossRewardAd({
  slotId,
  children,
  description = '광고를 시청하면 결과를 확인할 수 있어요',
  buttonText = '광고 보고 확인하기',
  onRewarded,
}: TossRewardAdProps) {
  const { isShowing, reward, show } = useTossAd({ slotId });
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked || reward) {
    return <>{children}</>;
  }

  const handleWatch = async () => {
    await show();
    setUnlocked(true);
    onRewarded?.();
  };

  return (
    <div className="reward-ad-gate">
      <p className="reward-ad-description">{description}</p>
      <button
        className={`reward-ad-button${isShowing ? ' reward-ad-button--loading' : ''}`}
        onClick={handleWatch}
        disabled={isShowing}
      >
        {isShowing ? '광고 재생 중...' : buttonText}
      </button>
    </div>
  );
}
