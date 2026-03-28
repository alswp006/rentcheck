import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ListRow,
  Spacing,
  Top,
  AlertDialog,
  Toast,
} from "@toss/tds-mobile";
import { storageAdapter } from "@/lib/storage/localStorageAdapter";
import type { HistoryEntry } from "@/lib/types";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await storageAdapter.listHistory({ page: 1, pageSize: 5 });
      if (result.ok) {
        setItems(result.data.items);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (entry: HistoryEntry) => {
    const result = await storageAdapter.deleteHistoryById(entry.id);
    if (result.ok) {
      setItems((prev) => prev.filter((e) => e.id !== entry.id));
    } else {
      setToastText("삭제에 실패했어요");
      setToastOpen(true);
      setTimeout(() => setToastOpen(false), 2000);
    }
  };

  const handleClearConfirm = async () => {
    const result = await storageAdapter.clearHistory();
    setClearDialogOpen(false);
    if (result.ok) {
      setItems([]);
    }
  };

  return (
    <>
      <Top title={<Top.TitleParagraph>히스토리</Top.TitleParagraph>} />

      {error && (
        <>
          <Spacing size={32} />
          <div style={{ textAlign: "center" }}>
            <p>불러오지 못했어요</p>
            <Button onClick={fetchHistory}>다시 불러오기</Button>
          </div>
          <Spacing size={32} />
        </>
      )}

      {!error && !loading && items.length === 0 && (
        <>
          <Spacing size={32} />
          <div style={{ textAlign: "center" }}>
            <p>아직 기록이 없어요</p>
            <Button onClick={() => navigate("/input")}>지금 비교하러 가기</Button>
          </div>
          <Spacing size={32} />
        </>
      )}

      {!error && items.length > 0 && (
        <>
          <Spacing size={8} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setClearDialogOpen(true)}>전체 삭제</Button>
          </div>
          {items.map((entry) => (
            <ListRow
              key={entry.id}
              onClick={() => navigate("/result", { state: { input: entry.input } })}
            >
              <ListRow.Texts type="2RowTypeA" top={entry.label} bottom={new Date(entry.createdAt).toLocaleDateString("ko-KR")} />
              <button
                aria-label="삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(entry);
                }}
              >
                삭제
              </button>
            </ListRow>
          ))}
        </>
      )}

      <AlertDialog
        open={clearDialogOpen}
        title="전체 삭제"
        description="모든 히스토리를 삭제할까요?"
        alertButton={
          <>
            <AlertDialog.AlertButton onClick={handleClearConfirm}>삭제</AlertDialog.AlertButton>
            <AlertDialog.AlertButton onClick={() => setClearDialogOpen(false)}>닫기</AlertDialog.AlertButton>
          </>
        }
        onClose={() => setClearDialogOpen(false)}
      />

      <Toast open={toastOpen} text={toastText} position="bottom" onClose={() => setToastOpen(false)} />
    </>
  );
}
