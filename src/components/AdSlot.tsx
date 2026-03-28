interface AdSlotProps {
  slotId: string;
  className?: string;
}

export function AdSlot({ slotId, className }: AdSlotProps) {
  return (
    <div data-ad-slot={slotId} className={className ?? "ad-slot"} />
  );
}
