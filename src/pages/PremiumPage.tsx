import React from "react";
import {
  Top,
  Button,
  ListRow,
  Spacing,
  Paragraph,
  Border,
} from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { useTossLogin } from "@/hooks/useTossLogin";

const FREE_YEARS = 10;
const PREMIUM_YEARS = 20;

const BENEFITS = [
  "상세 비용 분석 광고 없이 보기",
  `거주기간 최대 ${PREMIUM_YEARS}년으로 확장`,
] as const;

export default function PremiumPage(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useTossLogin();

  const handlePayment = (): void => {
    // stub: 다음 패킷에서 결제 SDK 연결
  };

  return (
    <>
      <Top>
        <Top.TitleParagraph>프리미엄</Top.TitleParagraph>
      </Top>

      <Spacing />

      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로"
        style={{
          background: "none",
          border: "none",
          padding: "12px 16px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        ← 뒤로
      </button>

      <Spacing />

      {/* 요약 카드 */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            background: "var(--tds-color-grey50, #f4f4f4)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <Paragraph.Text typography="t5">
            프리미엄으로 더 정확한 비교를
          </Paragraph.Text>
          <Spacing />
          <Paragraph.Text typography="st6">
            {`무료: ${FREE_YEARS}년 시뮬레이션`}
          </Paragraph.Text>
          <Spacing />
          <Paragraph.Text typography="st6">
            {`프리미엄: ${PREMIUM_YEARS}년 시뮬레이션`}
          </Paragraph.Text>
        </div>
      </div>

      <Spacing />

      {/* 혜택 리스트 */}
      {BENEFITS.map((benefit) => (
        <React.Fragment key={benefit}>
          <ListRow>
            <ListRow.Text>{benefit}</ListRow.Text>
          </ListRow>
          <Border />
        </React.Fragment>
      ))}

      <Spacing />

      {/* 로그인 필요 안내 */}
      {user == null && (
        <div style={{ padding: "0 16px", textAlign: "center" }}>
          <Paragraph.Text typography="st8">
            로그인 후 결제할 수 있어요
          </Paragraph.Text>
        </div>
      )}

      <Spacing />

      {/* 결제 CTA */}
      <div
        style={{
          padding: "0 16px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <Button
          variant="fill"
          color="primary"
          size="large"
          onClick={handlePayment}
        >
          프리미엄 결제
        </Button>
      </div>
    </>
  );
}
