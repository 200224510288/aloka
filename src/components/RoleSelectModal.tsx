'use client';

import React from 'react';
import { Printer, Pencil, ShieldCheck, Zap, CheckCircle2, User, ArrowRight, X } from 'lucide-react';
import { UserRole } from '@/lib/user-role';

interface RoleSelectModalProps {
  isOpen: boolean;
  currentRole?: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onClose?: () => void;
}

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  isOpen,
  currentRole,
  onSelectRole,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header — Solid Corporate Slate */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 border-b border-slate-800 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-base text-white">
              ජ
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                භූමිකාව තෝරාගැනීම • Role Selection
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2 font-sinhala leading-snug">
            ඔබ අලෝක ද නැතහොත් කාර්ය මණ්ඩල සාමාජිකයෙක්ද?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-sinhala leading-relaxed">
            ජය මාවත ලොතරැයි පද්ධතිය වෙත සාදරයෙන් පිළිගනිමු. කරුණාකර ඔබගේ සුදුසු අංශය තෝරන්න:
          </p>
        </div>

        {/* Modal Selection Cards */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Staff Member (Automated Flow) */}
            <div 
              onClick={() => onSelectRole('staff')}
              className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between bg-white ${
                currentRole === 'staff'
                  ? 'border-emerald-700 bg-emerald-50/30 shadow-sm'
                  : 'border-slate-200 hover:border-emerald-700 hover:shadow-xs'
              }`}
            >
              <div className="absolute top-3.5 right-3.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-700 fill-emerald-700" />
                  ස්වයංක්‍රීයයි
                </span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-lg bg-emerald-700 text-white flex items-center justify-center mb-3">
                  <Printer className="w-5 h-5" />
                </div>

                <h3 className="text-base font-black text-slate-900 font-sinhala">
                  කාර්ය මණ්ඩලය (Staff)
                </h3>
                <p className="text-xs font-bold text-emerald-800 mb-3 font-sinhala">
                  ස්වයංක්‍රීය නිල සත්‍යාපනය සහ මුද්‍රණය
                </p>

                <div className="space-y-2 mb-4 text-xs text-slate-600 font-sinhala">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>රාජ්‍ය (NLB) සහ සංවර්ධන (DLB) ලොතරැයි මණ්ඩල සජීවී නිල දත්ත ස්වයංක්‍රීයව ලබාගනී.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>AI භාවිත නොවේ</strong> — 100% නිල රාජ්‍ය ද්වාරවල නියම ප්‍රතිඵල පමණි.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>සියල්ල ස්වයංක්‍රීයව පිරවී මුද්‍රණයට සූදානම් වේ. ඔබ කළ යුත්තේ <strong>Print</strong> බොත්තම එබීම පමණි.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectRole('staff')}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer font-sinhala"
              >
                <span>කාර්ය මණ්ඩල අංශයට පිවිසෙන්න</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Aloka (Full Admin & Editor) */}
            <div 
              onClick={() => onSelectRole('aloka')}
              className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between bg-white ${
                currentRole === 'aloka'
                  ? 'border-slate-900 bg-slate-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-900 hover:shadow-xs'
              }`}
            >
              <div className="absolute top-3.5 right-3.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  <User className="w-3 h-3 text-slate-700" />
                  පරිපාලක
                </span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
                  <Pencil className="w-5 h-5" />
                </div>

                <h3 className="text-base font-black text-slate-900 font-sinhala">
                  අලෝක (Aloka)
                </h3>
                <p className="text-xs font-bold text-slate-700 mb-3 font-sinhala">
                  පූර්ණ සංස්කාරකය සහ පරිපාලන මෙවලම්
                </p>

                <div className="space-y-2 mb-4 text-xs text-slate-600 font-sinhala">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                    <span>ලොතරැයි ප්‍රතිඵල අත්පොතින් වෙනස් කිරීම සහ සම්පූර්ණ සංස්කරණය.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                    <span>මූලාශ්‍ර ලේඛන පරිලෝකනය (Upload/OCR), AI සත්‍යාපනය සහ නිල සත්‍යාපනය.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                    <span>A4 පත්‍රිකා සැලසුම් සැකසුම් (Custom Styles) සහ ක්ලවුඩ් සමමුහුර්තකරණය.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectRole('aloka')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer font-sinhala"
              >
                <span>අලෝක ලෙස පිවිසෙන්න</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500 font-sinhala">
              💡 සටහන: ඔබට ඕනෑම අවස්ථාවක ඉහළ මෙනුවේ ඇති භූමිකාව බොත්තම මඟින් මෙම අංශ දෙක අතර මාරු විය හැක.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
