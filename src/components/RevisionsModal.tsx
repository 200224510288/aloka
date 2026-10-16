'use client';

import React from 'react';
import { X, History, RotateCcw, Clock, Calendar, CheckCircle } from 'lucide-react';
import { RevisionRecord, DailySheet } from '@/types/lottery';

interface RevisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: RevisionRecord[];
  onRestoreRevision: (snapshot: DailySheet) => void;
}

export const RevisionsModal: React.FC<RevisionsModalProps> = ({
  isOpen,
  onClose,
  revisions,
  onRestoreRevision,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Revision History & Audit Log</h3>
              <p className="text-xs text-slate-500">Traceable records of all updates for this sheet date</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {revisions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No revisions logged yet for this date.</p>
              <p className="text-xs">Saving changes creates timestamped audit snapshots.</p>
            </div>
          ) : (
            revisions.map((rev, index) => {
              const dateObj = new Date(rev.timestamp);
              const formattedTime = isNaN(dateObj.getTime())
                ? rev.timestamp
                : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + dateObj.toLocaleDateString();

              return (
                <div
                  key={rev.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {revisions.length - index}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{rev.summary}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedTime}</span>
                        <span>•</span>
                        <span>{rev.snapshot.lotteries.filter(l => l.isCheckedAgainstSource).length}/{rev.snapshot.lotteries.length || 18} checked</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Restore snapshot from ${formattedTime}? Any unsaved work will be overwritten.`)) {
                        onRestoreRevision(rev.snapshot);
                        onClose();
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1 shrink-0 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
