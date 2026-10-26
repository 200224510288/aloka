'use client';

import React from 'react';
import { AgentRecord, SenderSettings, LabelFontSettings } from '@/types/agent';
import { UserPlus, X, Copy, Edit2 } from 'lucide-react';

interface ParcelLabelCardProps {
  agent: AgentRecord | null;
  sender: SenderSettings;
  fontSettings?: LabelFontSettings;
  slotIndex?: number;
  onSelectSlot?: (index: number) => void;
  onClearSlot?: (index: number) => void;
  onEditAgent?: (agent: AgentRecord) => void;
  onDuplicateSlot?: (agent: AgentRecord) => void;
  isInteractive?: boolean;
  scale?: number;
  className?: string;
}

export const ParcelLabelCard: React.FC<ParcelLabelCardProps> = ({
  agent,
  sender,
  fontSettings,
  slotIndex,
  onSelectSlot,
  onClearSlot,
  onEditAgent,
  onDuplicateSlot,
  isInteractive = true,
  className = '',
}) => {
  if (!agent) {
    return (
      <div
        onClick={() => slotIndex !== undefined && onSelectSlot && onSelectSlot(slotIndex)}
        className={`group relative w-full h-full min-h-[160px] rounded border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/20 flex flex-col items-center justify-center p-3 text-center transition-all cursor-pointer select-none ${className}`}
      >
        <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 group-hover:border-blue-300 group-hover:scale-105 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all mb-1.5">
          <UserPlus className="w-4 h-4" />
        </div>
        <p className="text-xs font-normal text-slate-700 font-sinhala group-hover:text-blue-700">
          {slotIndex !== undefined ? `කොටස ${slotIndex + 1}` : 'අලෙවි නියෝජිතයෙකු තෝරන්න'}
        </p>
        <p className="text-[10px] text-slate-400 font-sinhala mt-0.5">
          ක්ලික් කර අලෙවි නියෝජිතයෙකු ඇතුළත් කරන්න
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-white select-none ${className}`}>
      {/* Action buttons overlay for screen mode */}
      {isInteractive && (
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded shadow-xs border border-slate-200 no-print">
          {onDuplicateSlot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSlot(agent);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600"
              title="සියලු කොටස් 4ම මෙම නියෝජිතයාගෙන් පුරවන්න"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditAgent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditAgent(agent);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-amber-600"
              title="නියෝජිත තොරතුරු සංස්කරණය"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {slotIndex !== undefined && onClearSlot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearSlot(slotIndex);
              }}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
              title="මෙම කොටස ඉවත් කරන්න"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Single Border Frame - Utilises full 1/4 A4 quadrant */}
      <div className="w-full h-full border border-black p-3 sm:p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden bg-white box-border">
        
        {/* Top Section: Agent / Recipient Details - Customizable font size */}
        <div className="space-y-1 sm:space-y-1.5 text-slate-900 font-sinhala font-normal">
          <div className="flex items-baseline gap-2 sm:gap-2.5 leading-snug">
            <span 
              className="whitespace-nowrap text-slate-900 font-normal shrink-0"
              style={{ fontSize: fontSettings ? `${Math.round(fontSettings.agentDetailsSize * 0.9)}px` : undefined }}
            >
              අලෙවි නියෝජිත :
            </span>
            <span 
              className="text-black font-sinhala font-medium"
              style={{ fontSize: fontSettings ? `${fontSettings.agentNameSize}px` : undefined }}
            >
              {agent.name}
            </span>
          </div>

          <div className="flex items-baseline gap-2 sm:gap-2.5 leading-snug">
            <span 
              className="whitespace-nowrap text-slate-900 font-normal shrink-0"
              style={{ fontSize: fontSettings ? `${Math.round(fontSettings.agentDetailsSize * 0.9)}px` : undefined }}
            >
              නගරය :
            </span>
            <span 
              className="text-black font-sinhala font-normal"
              style={{ fontSize: fontSettings ? `${fontSettings.agentDetailsSize}px` : undefined }}
            >
              {agent.town}
            </span>
          </div>

          <div className="flex items-baseline gap-2 sm:gap-2.5 leading-snug">
            <span 
              className="whitespace-nowrap text-slate-900 font-normal shrink-0"
              style={{ fontSize: fontSettings ? `${Math.round(fontSettings.agentDetailsSize * 0.9)}px` : undefined }}
            >
              දුරකථන අංකය :
            </span>
            <span 
              className="text-black tracking-wider font-normal font-mono"
              style={{ fontSize: fontSettings ? `${fontSettings.agentDetailsSize}px` : undefined }}
            >
              {agent.phone}
            </span>
          </div>
        </div>

        {/* Center Section: Delivery Note (ලබා දෙන්න.) - Centered Prominently */}
        <div className="my-auto w-full flex items-center justify-center text-center py-0.5 sm:py-1">
          <div 
            className="text-black font-sinhala font-normal tracking-wide text-center"
            style={{ fontSize: fontSettings ? `${fontSettings.centerNoteSize}px` : undefined }}
          >
            {sender.centerNote || 'ලබා දෙන්න.'}
          </div>
        </div>

        {/* Bottom Section: Sender / Dealer Details - Proportioned cleanly */}
        <div className="space-y-0.5 text-slate-800 font-sinhala font-normal pt-1">
          <div 
            className="text-black font-medium leading-tight"
            style={{ fontSize: fontSettings ? `${Math.round(fontSettings.senderSize * 1.15)}px` : undefined }}
          >
            {sender.name}
          </div>
          <div 
            className="text-slate-700 font-light leading-tight"
            style={{ fontSize: fontSettings ? `${fontSettings.senderSize}px` : undefined }}
          >
            {sender.designation}
          </div>
          <div 
            className="text-slate-700 font-light leading-tight"
            style={{ fontSize: fontSettings ? `${fontSettings.senderSize}px` : undefined }}
          >
            {sender.address}
          </div>
          <div 
            className="tracking-wider text-black font-normal leading-tight font-mono"
            style={{ fontSize: fontSettings ? `${fontSettings.senderSize}px` : undefined }}
          >
            {sender.phone}
          </div>
        </div>

      </div>
    </div>
  );
};
