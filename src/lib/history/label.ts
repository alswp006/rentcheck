import type { SimulationInput } from "@/lib/types";

export function buildHistoryLabel(
  input: SimulationInput,
  presetNameOrNull: string | null
): string {
  if (presetNameOrNull && presetNameOrNull.length > 0) {
    return presetNameOrNull;
  }
  if (input.jeonseDeposit === 0 && input.buyPrice === 0 && input.monthlyDeposit === 0) {
    return `기본 시뮬레이션 · ${input.residenceYears}년`;
  }
  const deposit = input.jeonseDeposit > 0
    ? `전세 ${Math.round(input.jeonseDeposit / 10000)}만`
    : input.buyPrice > 0
    ? `매매 ${Math.round(input.buyPrice / 10000)}만`
    : `월세 ${Math.round(input.monthlyDeposit / 10000)}만`;
  return `${deposit} · ${input.residenceYears}년`;
}
