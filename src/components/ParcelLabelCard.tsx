'use client';

import React from 'react';
import { AgentRecord, SenderSettings } from '@/types/agent';
import { UserPlus, X, Copy, Edit2 } from 'lucide-react';

interface ParcelLabelCardProps {
  agent: AgentRecord | null;
  sender: SenderSettings;
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
    <div
      className={`relative w-full h-full bg-white select-none ${className}`}
      style={{
        aspectRatio: '148.5 / 105',
      }}
    >
      {/* Action buttons overlay for screen mode */}
      {isInteractive && (
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded shadow-xs border border-slate-200 no-print">
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

      {/* Single Border Frame (Reduced cutting free space, tight fit) */}
      <div className="w-full h-full p-[1.5mm] box-border bg-white">
        <div className="w-full h-full border border-black p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden bg-white">
          
          {/* Top Section: Agent / Recipient Details (Light font weight, avoid bold) */}
          <div className="space-y-1 text-slate-900 font-sinhala font-normal">
            <div className="flex items-baseline gap-2 text-base sm:text-lg font-normal">
              <span className="whitespace-nowrap text-slate-800 font-normal">අලෙවි නියෝජිත :</span>
              <span className="text-black font-sinhala text-lg sm:text-xl font-normal">
                {agent.name}
              </span>
            </div>

            <div className="flex items-baseline gap-2 text-sm sm:text-base font-normal">
              <span className="whitespace-nowrap text-slate-800 font-normal">නගරය :</span>
              <span className="text-black font-sinhala font-normal">
                {agent.town}
              </span>
            </div>

            <div className="flex items-baseline gap-2 text-sm sm:text-base font-normal">
              <span className="whitespace-nowrap text-slate-800 font-normal">දුරකථන අංකය :</span>
              <span className="text-black tracking-wider font-normal">
                {agent.phone}
              </span>
            </div>
          </div>

          {/* Center Section: Delivery Note (ලබා දෙන්න.) (Light font weight, avoid bold) */}
          <div className="my-auto self-center sm:self-end sm:mr-8 text-center sm:text-right py-0.5">
            <div className="text-2xl sm:text-3xl text-black font-sinhala font-normal tracking-wide">
              {sender.centerNote || 'ලබා දෙන්න.'}
            </div>
          </div>

          {/* Bottom Section: Sender / Dealer Details (Light font weight, avoid bold) */}
          <div className="space-y-0.5 text-slate-800 font-sinhala font-normal pt-1 border-t border-slate-100">
            <div className="text-xs sm:text-sm text-black font-normal">
              {sender.name}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-700 font-light">
              {sender.designation}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-700 font-light">
              {sender.address}
            </div>
            <div className="text-[11px] sm:text-xs tracking-wider text-black font-normal">
              {sender.phone}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
