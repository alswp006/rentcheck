import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("프리셋/기본 입력 + 유틸(딥카피/uuid/라벨)", () => {
  // AC-1 & AC-2: PRESET_SCENARIOS
  it("AC-1: PRESET_SCENARIOS exports exactly 4 presets", async () => {
    const { PRESET_SCENARIOS } = await import("@/lib/presets");
    expect(PRESET_SCENARIOS).toHaveLength(4);
  });

  it("AC-2: first preset has correct id, name, and defaultInput fields", async () => {
    const { PRESET_SCENARIOS } = await import("@/lib/presets");
    const first = PRESET_SCENARIOS[0];
    expect(first.id).toBe("preset-1");
    expect(first.name).toBe("프리셋1");
    expect(first.defaultInput.presetId).toBe("preset-1");
    expect(first.defaultInput.jeonseDeposit).toBe(300_000_000);
    expect(first.defaultInput.residenceYears).toBe(10);
  });

  // AC-3: createDefaultSimulationInput
  it("AC-3: createDefaultSimulationInput returns SimulationInput with residenceYears", async () => {
    const { createDefaultSimulationInput } = await import("@/lib/presets");
    const input = createDefaultSimulationInput();
    expect(input).toHaveProperty("id");
    expect(input).toHaveProperty("presetId");
    expect(input).toHaveProperty("jeonseDeposit");
    expect(input).toHaveProperty("residenceYears");
    expect(typeof input.residenceYears).toBe("number");
  });

  // AC-4: createSimulationInputFromPreset — same values, different reference
  it("AC-4: createSimulationInputFromPreset returns deep copy with same values but different reference", async () => {
    const { PRESET_SCENARIOS, createSimulationInputFromPreset } = await import("@/lib/presets");
    const preset = PRESET_SCENARIOS[0];
    const result = createSimulationInputFromPreset(preset);
    // same values
    expect(result.jeonseDeposit).toBe(preset.defaultInput.jeonseDeposit);
    expect(result.residenceYears).toBe(preset.defaultInput.residenceYears);
    // different reference
    expect(result).not.toBe(preset.defaultInput);
  });

  // AC-5: createUuid
  it("AC-5a: createUuid uses crypto.randomUUID when available", async () => {
    const mockUUID = "12345678-1234-1234-1234-123456789abc";
    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, "crypto", {
        value: { randomUUID: vi.fn().mockReturnValue(mockUUID) },
        configurable: true,
      });
      const { createUuid } = await import("@/lib/utils/uuid");
      expect(createUuid()).toBe(mockUUID);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
    }
  });

  it("AC-5b: createUuid returns non-empty uuid-like string when crypto.randomUUID unavailable", async () => {
    vi.resetModules();
    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
      const { createUuid } = await import("@/lib/utils/uuid");
      const result = createUuid();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
    }
  });

  // AC-6: deepClone — no shared nested references
  it("AC-6: deepClone breaks nested object references", async () => {
    const { deepClone } = await import("@/lib/utils/clone");
    const original = { a: { b: { c: 42 } }, d: [1, 2, 3] };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.a).not.toBe(original.a);
    expect(cloned.a.b).not.toBe(original.a.b);
    expect(cloned.d).not.toBe(original.d);
  });

  // AC-7: buildHistoryLabel — always returns non-empty string
  it("AC-7a: buildHistoryLabel returns non-empty string with preset name", async () => {
    const { buildHistoryLabel } = await import("@/lib/history/label");
    const { createDefaultSimulationInput } = await import("@/lib/presets");
    const input = createDefaultSimulationInput();
    const label = buildHistoryLabel(input, "프리셋1");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-7b: buildHistoryLabel returns non-empty string when presetName is null", async () => {
    const { buildHistoryLabel } = await import("@/lib/history/label");
    const { createDefaultSimulationInput } = await import("@/lib/presets");
    const input = createDefaultSimulationInput();
    const label = buildHistoryLabel(input, null);
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThanOrEqual(1);
  });
});
