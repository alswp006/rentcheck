import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Top, TextField, Button, Tab, Spacing, Toast } from "@toss/tds-mobile";
import type { SimulationInput, OptionKey } from "@/lib/types";
import { createDefaultSimulationInput } from "@/lib/presets";

type FieldDef = {
  key: keyof SimulationInput;
  label: string;
  suffix: string;
  divisor: number;
};

const JEONSE_FIELDS: FieldDef[] = [
  { key: "jeonseDeposit", label: "전세 보증금", suffix: "만원", divisor: 10000 },
  { key: "jeonseLoanRatio", label: "전세 대출 비율", suffix: "%", divisor: 0.01 },
  { key: "jeonseInterestRate", label: "대출 이자율", suffix: "%", divisor: 0.01 },
];

const MONTHLY_FIELDS: FieldDef[] = [
  { key: "monthlyDeposit", label: "보증금", suffix: "만원", divisor: 10000 },
  { key: "monthlyRent", label: "월세", suffix: "만원", divisor: 10000 },
  { key: "monthlyRentIncreaseRate", label: "월세 인상률 (연)", suffix: "%", divisor: 0.01 },
];

const BUY_FIELDS: FieldDef[] = [
  { key: "buyPrice", label: "매매가", suffix: "만원", divisor: 10000 },
  { key: "buyEquity", label: "자기자본", suffix: "만원", divisor: 10000 },
  { key: "buyLoanRate", label: "대출 이자율", suffix: "%", divisor: 0.01 },
  { key: "buyLoanPeriodYears", label: "대출 기간", suffix: "년", divisor: 1 },
];

const COMMON_FIELDS: FieldDef[] = [
  { key: "initialAsset", label: "보유 자산", suffix: "만원", divisor: 10000 },
  { key: "residenceYears", label: "거주 기간", suffix: "년", divisor: 1 },
  { key: "investmentReturnRate", label: "투자 수익률 (연)", suffix: "%", divisor: 0.01 },
  { key: "housePriceGrowthRate", label: "집값 상승률 (연)", suffix: "%", divisor: 0.01 },
];

const TAB_KEYS: OptionKey[] = ["jeonse", "monthly", "buy"];
const TAB_LABELS: Record<OptionKey, string> = {
  jeonse: "전세",
  monthly: "월세",
  buy: "매매",
};

function toDisplay(value: number, divisor: number): string {
  if (value === 0) return "";
  const display = value / divisor;
  // Avoid floating-point artifacts
  return String(Math.round(display * 10000) / 10000);
}

function fromDisplay(text: string, divisor: number): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  if (isNaN(parsed)) return 0;
  return parsed * divisor;
}

export default function InputPage(): React.ReactElement {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OptionKey>("jeonse");
  const [input, setInput] = useState<SimulationInput>(createDefaultSimulationInput);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  const handleFieldChange = useCallback(
    (key: keyof SimulationInput, divisor: number) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setInput((prev) => ({
          ...prev,
          [key]: fromDisplay(raw, divisor),
          updatedAt: Date.now(),
        }));
      },
    [],
  );

  const handleSubmit = (): void => {
    if (input.residenceYears <= 0) {
      setToastText("거주 기간을 입력해 주세요");
      setToastOpen(true);
      return;
    }
    navigate("/result", { state: { input } });
  };

  const renderFields = (fields: FieldDef[]) =>
    fields.map(({ key, label, suffix, divisor }) => (
      <React.Fragment key={key}>
        <TextField
          label={label}
          value={toDisplay(input[key] as number, divisor)}
          onChange={handleFieldChange(key, divisor)}
          inputMode="decimal"
          suffix={suffix}
        />
        <Spacing size={12} />
      </React.Fragment>
    ));

  const TAB_FIELD_MAP: Record<OptionKey, FieldDef[]> = {
    jeonse: JEONSE_FIELDS,
    monthly: MONTHLY_FIELDS,
    buy: BUY_FIELDS,
  };

  return (
    <div>
      <Top>
        <Top.TitleParagraph>조건 입력</Top.TitleParagraph>
      </Top>

      <Spacing size={8} />

      <Tab value={activeTab} onChange={(val: string) => setActiveTab(val as OptionKey)}>
        {TAB_KEYS.map((key) => (
          <Tab.Item key={key} value={key}>
            {TAB_LABELS[key]}
          </Tab.Item>
        ))}
      </Tab>

      <Spacing size={20} />

      {renderFields(TAB_FIELD_MAP[activeTab])}

      <Spacing size={24} />

      {renderFields(COMMON_FIELDS)}

      <Spacing size={24} />

      <Button variant="fill" color="primary" size="large" onClick={handleSubmit}>
        비교 결과 보기
      </Button>

      <Toast
        open={toastOpen}
        text={toastText}
        position="bottom"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
