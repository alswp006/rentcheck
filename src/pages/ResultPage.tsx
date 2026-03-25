import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Chip, ListRow, Spacing, Top, Paragraph } from "@toss/tds-mobile";
import type { SimulationInput, OptionKey } from "@/lib/types";
import { simulate } from "@/lib/simulation/simulate";
import { formatCurrency } from "@/lib/utils";
import { AdSlot } from "@/components/AdSlot";

const OPTION_LABELS: Record<OptionKey, string> = {
  jeonse: "전세",
  monthly: "월세",
  buy: "매매",
};

export default function ResultPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const input =
    (location.state as { input?: SimulationInput } | null)?.input ?? null;

  const simResult = useMemo(() => {
    if (!input) return null;
    return simulate(input);
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = (): void => navigate("/input");

  if (!input || !simResult) {
    return (
      <div>
        <Top>
          <Top.TitleParagraph>비교 결과</Top.TitleParagraph>
        </Top>
        <Paragraph.Text typography="st6">입력값이 없어요</Paragraph.Text>
        <Button variant="fill" color="primary" onClick={handleRetry}>
          조건 다시 입력하기
        </Button>
      </div>
    );
  }

  if (!simResult.ok) {
    return (
      <div>
        <Top>
          <Top.TitleParagraph>비교 결과</Top.TitleParagraph>
        </Top>
        <Spacing size={16} />
        <Paragraph.Text typography="st6">{simResult.message}</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" color="primary" onClick={handleRetry}>
          조건 다시 입력하기
        </Button>
      </div>
    );
  }

  const result = simResult.data;
  const years = input.residenceYears;

  return (
    <div>
      <Top>
        <Top.TitleParagraph>비교 결과</Top.TitleParagraph>
      </Top>

      <Spacing size={16} />
      <div
        style={{
          backgroundColor: "var(--tds-color-grey50)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <Paragraph.Text typography="st6">{result.insightCopy}</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st6">
          {years}년 후 순자산을 기준으로 비교했어요
        </Paragraph.Text>
      </div>

      <Spacing size={16} />
      <Paragraph.Text typography="t3">선택지 비교</Paragraph.Text>
      <Spacing size={12} />

      {(["jeonse", "monthly", "buy"] as OptionKey[]).map((option) => {
        const isRecommended = result.recommendedOption === option;
        const netWorth = result.finalNetWorth[option];
        return (
          <ListRow key={option} padding="M" onClick={() => {}}>
            <ListRow.Texts
              top={OPTION_LABELS[option]}
              bottom={`${years}년 후 순자산: ${formatCurrency(netWorth)}`}
            />
            {isRecommended && <Chip label="추천" variant="filled" />}
          </ListRow>
        );
      })}

      <Spacing size={24} />
      <AdSlot slotId="result-bottom" />
    </div>
  );
}
