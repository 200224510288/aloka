'use client';

import { AgentRecord, SenderSettings, LabelFontSettings } from '@/types/agent';
import { ParcelLabelCard } from './ParcelLabelCard';
import { Scissors } from 'lucide-react';

interface ParcelSheetPrintViewProps {
  slots: (AgentRecord | null)[];
  sender: SenderSettings;
  fontSettings?: LabelFontSettings;
  onSelectSlot?: (index: number) => void;
  onClearSlot?: (index: number) => void;
  onEditAgent?: (agent: AgentRecord) => void;
  onDuplicateSlot?: (agent: AgentRecord) => void;
  isInteractive?: boolean;
}

export const ParcelSheetPrintView: React.FC<ParcelSheetPrintViewProps> = ({
  slots,
  sender,
  fontSettings,
  onSelectSlot,
  onClearSlot,
  onEditAgent,
  onDuplicateSlot,
  isInteractive = true,
}) => {
  // Ensure we always have exactly 4 slots for 1 A4 sheet
  const displaySlots = [
    slots[0] || null,
    slots[1] || null,
    slots[2] || null,
    slots[3] || null,
  ];

  return (
    <div className="w-full flex justify-center">
      {/* 
        A4 Landscape Container
        Standard A4: 297mm x 210mm (Aspect ratio: 297 / 210 = 1.4142857)
      */}
      <div
        id="parcel-a4-sheet"
        className="print-sheet relative bg-white shadow-xl rounded-sm border border-slate-200 overflow-hidden w-full max-w-[1123px]"
        style={{
          aspectRatio: '297 / 210',
        }}
      >
        {/* Subtle Scissor Guides in the center */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Vertical Cut Guide Line (Center: 50% = 148.5mm) */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-r border-dashed border-slate-300 flex flex-col justify-between items-center py-1.5">
            <span className="text-[10px] text-slate-400 bg-white px-0.5 font-mono flex items-center gap-0.5">
              <Scissors className="w-3 h-3 text-slate-400 rotate-90" />
            </span>
            <span className="text-[10px] text-slate-400 bg-white px-0.5 font-mono flex items-center gap-0.5">
              <Scissors className="w-3 h-3 text-slate-400 -rotate-90" />
            </span>
          </div>

          {/* Horizontal Cut Guide Line (Center: 50% = 105mm) */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-b border-dashed border-slate-300 flex justify-between items-center px-1.5">
            <span className="text-[10px] text-slate-400 bg-white px-0.5 font-mono flex items-center gap-0.5">
              <Scissors className="w-3 h-3 text-slate-400" />
            </span>
            <span className="text-[10px] text-slate-400 bg-white px-0.5 font-mono flex items-center gap-0.5">
              <Scissors className="w-3 h-3 text-slate-400 rotate-180" />
            </span>
          </div>
        </div>

        {/* 2x2 Quadrant Grid filling exact 100% space */}
        <div className="w-full h-full grid grid-cols-2 grid-rows-2">
          {displaySlots.map((agent, idx) => (
            <div
              key={idx}
              className="group relative w-full h-full box-border flex items-center justify-center overflow-hidden transition-all duration-150"
              style={{
                padding: `${fontSettings?.outerMarginMm !== undefined ? fontSettings.outerMarginMm : 8}mm`
              }}
            >
              <ParcelLabelCard
                agent={agent}
                sender={sender}
                fontSettings={fontSettings}
                slotIndex={idx}
                onSelectSlot={onSelectSlot}
                onClearSlot={onClearSlot}
                onEditAgent={onEditAgent}
                onDuplicateSlot={onDuplicateSlot}
                isInteractive={isInteractive}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
