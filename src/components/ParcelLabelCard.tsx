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
  scale?: number; // for preview scaling
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
        className={`group relative w-full h-full min-h-[220px] rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer select-none ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-slate-200 group-hover:border-blue-300 group-hover:scale-110 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all mb-3">
          <UserPlus className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700 font-sinhala group-hover:text-blue-700">
          {slotIndex !== undefined ? `කොටස ${slotIndex + 1}` : 'අලෙවි නියෝජිතයෙකු තෝරන්න'}
        </p>
        <p className="text-xs text-slate-500 font-sinhala mt-1">
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
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-md shadow-xs border border-slate-200 no-print">
          {onDuplicateSlot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSlot(agent);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600"
              title="සියලු කොටස් 4ම මෙම නියෝජිතයාගෙන් පුරවන්න (Fill all 4)"
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
              title="නියෝජිත තොරතුරු සංස්කරණය (Edit Agent)"
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
              title="මෙම කොටස ඉවත් කරන්න (Clear slot)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Exact Visual Frame Matching Photo (Double Border) */}
      <div className="w-full h-full p-[3mm] box-border bg-white">
        <div className="w-full h-full border border-black p-[2.5mm] box-border bg-white flex flex-col justify-between">
          <div className="w-full h-full border border-black p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden bg-white">
            
            {/* Top Section: Agent / Recipient Information */}
            <div className="space-y-1.5 text-black font-sinhala">
              <div className="flex items-baseline gap-2 text-lg sm:text-xl font-bold tracking-tight">
                <span className="whitespace-nowrap text-slate-900 font-bold">අලෙවි නියෝජිත :</span>
                <span className="font-extrabold text-black font-sinhala text-xl sm:text-2xl">
                  {agent.name}
                </span>
              </div>

              <div className="flex items-baseline gap-2 text-base sm:text-lg font-bold">
                <span className="whitespace-nowrap text-slate-900 font-bold">නගරය :</span>
                <span className="font-extrabold text-black font-sinhala">
                  {agent.town}
                </span>
              </div>

              <div className="flex items-baseline gap-2 text-base sm:text-lg font-bold">
                <span className="whitespace-nowrap text-slate-900 font-bold">දුරකථන අංකය :</span>
                <span className="font-extrabold text-black tracking-wider">
                  {agent.phone}
                </span>
              </div>
            </div>

            {/* Center Section: Delivery Note (ලබා දෙන්න.) */}
            <div className="my-auto self-center sm:self-end sm:mr-8 text-center sm:text-right py-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-black font-sinhala tracking-wide drop-shadow-2xs">
                {sender.centerNote || 'ලබා දෙන්න.'}
              </div>
            </div>

            {/* Bottom Section: Sender / Dealer Details */}
            <div className="space-y-0.5 text-slate-900 font-sinhala pt-1 border-t border-slate-100">
              <div className="text-xs sm:text-sm font-extrabold text-black">
                {sender.name}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800">
                {sender.designation}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-800">
                {sender.address}
              </div>
              <div className="text-[11px] sm:text-xs font-bold tracking-wider text-black">
                {sender.phone}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
