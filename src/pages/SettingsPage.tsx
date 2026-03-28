import React, { useState } from "react";
import {
  Top,
  ListRow,
  Spacing,
  AlertDialog,
  Toast,
  Border,
} from "@toss/tds-mobile";
import { useAppState } from "@/lib/state/useAppState";
import { storageAdapter } from "@/lib/storage/localStorageAdapter";

const COMPARISON_DESCRIPTION =
  "N년 후 순자산을 기준으로 전세·월세·매매 세 가지 옵션을 비교해요. " +
  "각 옵션의 초기 비용, 기회비용, 대출 상환금, 집값 변동을 모두 반영해 최종 자산을 산출해요.";

export default function SettingsPage(): React.ReactElement {
  const appState = useAppState();
  const effectiveEntitlement = appState.getEffectiveEntitlement(
    appState.entitlement.ownerUserId,
  );

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  const showToast = (text: string) => {
    setToastText(text);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2000);
  };

  const handleClearConfirm = async (): Promise<void> => {
    try {
      const result = await storageAdapter.clearHistory();
      setClearDialogOpen(false);
      if (result.ok) {
        showToast("지웠어요");
      } else {
        showToast("삭제에 실패했어요");
      }
    } catch {
      setClearDialogOpen(false);
      showToast("삭제에 실패했어요");
    }
  };

  return (
    <>
      <Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />

      <Spacing size={24} />

      {/* 이용권 섹션 */}
      <ListRow>
        <ListRow.Texts
          type="2RowTypeA"
          top="이용권"
          bottom={effectiveEntitlement.isPremium ? "프리미엄 사용 중" : "무료 사용 중"}
        />
      </ListRow>

      <Border />

      {/* 안내 섹션 */}
      <ListRow onClick={() => setInfoDialogOpen(true)}>
        <ListRow.Text>비교 방식 안내 다시 보기</ListRow.Text>
      </ListRow>

      <Border />

      {/* 데이터 섹션 */}
      <ListRow onClick={() => setClearDialogOpen(true)}>
        <ListRow.Text>히스토리 모두 지우기</ListRow.Text>
      </ListRow>

      {/* 히스토리 삭제 Dialog */}
      <AlertDialog
        open={clearDialogOpen}
        title="히스토리 삭제"
        description="모든 히스토리를 삭제할까요?"
        alertButton={
          <>
            <AlertDialog.AlertButton onClick={handleClearConfirm}>확인</AlertDialog.AlertButton>
            <AlertDialog.AlertButton onClick={() => setClearDialogOpen(false)}>취소</AlertDialog.AlertButton>
          </>
        }
        onClose={() => setClearDialogOpen(false)}
      />

      {/* 비교 방식 안내 Dialog */}
      <AlertDialog
        open={infoDialogOpen}
        title="비교 방식 안내"
        description={COMPARISON_DESCRIPTION}
        alertButton={
          <AlertDialog.AlertButton onClick={() => setInfoDialogOpen(false)}>확인</AlertDialog.AlertButton>
        }
        onClose={() => setInfoDialogOpen(false)}
      />

      <Toast
        open={toastOpen}
        text={toastText}
        position="bottom"
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}
