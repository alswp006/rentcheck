import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, ListRow, Button, AlertDialog, Toast, Paragraph, Spacing } from "@toss/tds-mobile";
import { useAppState } from "@/lib/state/useAppState";
import { PRESET_SCENARIOS } from "@/lib/presets";
import type { PresetScenario } from "@/lib/types";

const EXPECTED_PRESET_COUNT = 4;

export default function HomePage(): React.ReactElement {
  const { loading } = useAppState();
  const navigate = useNavigate();
  const [toastOpen, setToastOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(
    () => PRESET_SCENARIOS.length !== EXPECTED_PRESET_COUNT,
  );

  const handlePresetClick = (preset: PresetScenario): void => {
    try {
      navigate("/result", { state: { presetId: preset.id } });
    } catch {
      setToastOpen(true);
    }
  };

  const handleDialogConfirm = (): void => {
    setDialogOpen(false);
    navigate("/input");
  };

  const handleDirectInput = (): void => {
    navigate("/input");
  };

  if (loading) {
    return (
      <div>
        <Top title="RentCheck" />
        <Paragraph.Text typography="st6">불러오는 중...</Paragraph.Text>
      </div>
    );
  }

  return (
    <div>
      <Top title="RentCheck" />
      {PRESET_SCENARIOS.map((preset) => (
        <ListRow
          key={preset.id}
          title={preset.name}
          padding="M"
          onClick={() => handlePresetClick(preset)}
        />
      ))}
      <Spacing size={16} />
      <Button variant="weak" size="large" onClick={handleDirectInput}>
        직접 입력하기
      </Button>
      <AlertDialog
        open={dialogOpen}
        title="알림"
        description="프리셋을 불러오지 못했어요"
        alertButton={
          <AlertDialog.AlertButton onClick={handleDialogConfirm}>확인</AlertDialog.AlertButton>
        }
        onClose={() => setDialogOpen(false)}
      />
      <Toast
        open={toastOpen}
        text="이동에 실패했어요"
        position="bottom"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
