import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, ListRow, Badge, Button, Spacing, BottomCTA } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { PRESET_SCENARIOS } from '@/lib/presets';
import type { PresetScenario } from '@/lib/types';

const PRESET_CHIPS: Record<PresetScenario['id'], string[]> = {
  preset_young_jeonse: ['전세', '추천'],
  preset_newlyweds_compare: ['전세', '월세'],
  preset_monthly_invest: ['월세'],
  preset_buy_focus: ['매매'],
};

export default function HomePage() {
  const navigate = useNavigate();

  function handlePresetClick(presetId: PresetScenario['id']) {
    generateHapticFeedback({ type: 'tickWeak' });
    navigate('/simulate', { state: { presetId, source: 'home' } });
  }

  function handleCtaClick() {
    generateHapticFeedback({ type: 'success' });
    navigate('/simulate', { state: { source: 'home' } });
  }

  return (
    <div>
      <Top title={<Top.TitleParagraph>RentCheck</Top.TitleParagraph>} />

      <Spacing size={16} />
      <Paragraph.Text typography="st7">
        프리셋으로 빠르게 시작하거나, 직접 입력으로 시뮬레이션할 수 있어요
      </Paragraph.Text>

      <Spacing size={20} />

      {PRESET_SCENARIOS.map((preset, idx) => (
        <div key={preset.id}>
          {idx > 0 && <Spacing size={8} />}
          <ListRow
            onClick={() => handlePresetClick(preset.id)}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={preset.name}
                bottom={preset.defaultInput.residencePeriodYears + '년 거주 기준'}
              />
            }
            right={
              <div className="flex" style={{ gap: 'var(--tds-spacing-8, 8px)' }}>
                {PRESET_CHIPS[preset.id].map((label) => (
                  <Badge key={label} variant="weak" size="xsmall" color="blue">{label}</Badge>
                ))}
              </div>
            }
          />
        </div>
      ))}

      <Spacing size={24} />

      <BottomCTA>
        <Button variant="fill" size="large" onClick={handleCtaClick} data-testid="cta-button">
          직접 입력할게요
        </Button>
      </BottomCTA>
    </div>
  );
}
