'use client';

import React, { useState, useEffect } from 'react';
import { SenderSettings, DEFAULT_SENDER_SETTINGS } from '@/types/agent';
import { X, Save, RotateCcw, Building, MapPin, Phone, MessageSquare } from 'lucide-react';

interface SenderSettingsModalProps {
  isOpen: boolean;
  settings: SenderSettings;
  onClose: () => void;
  onSave: (settings: SenderSettings) => void;
}

export const SenderSettingsModal: React.FC<SenderSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<SenderSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleReset = () => {
    setFormData(DEFAULT_SENDER_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-sinhala">
                යවන්නාගේ තොරතුරු (Sender Details)
              </h3>
              <p className="text-xs text-slate-400">
                ලේබලයේ පහළ මුද්‍රණය වන නියෝජිත තොරතුරු
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Dealer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              නියෝජිත ආයතනය / නම (Dealer Name)
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sinhala font-bold"
            />
          </div>

          {/* Designation / Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              තනතුර / විස්තරය (Designation / Title)
            </label>
            <input
              type="text"
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sinhala"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              ලිපිනය (Address)
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sinhala"
            />
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              දුරකථන අංක (Phone Numbers)
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
            />
          </div>

          {/* Center Instruction Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              මැද සටහන (Center Delivery Instruction Note)
            </label>
            <input
              type="text"
              required
              value={formData.centerNote}
              onChange={(e) => setFormData({ ...formData, centerNote: e.target.value })}
              placeholder="ලබා දෙන්න."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sinhala font-extrabold text-lg"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>පෙරනිමි අගයන්ට සකසන්න</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>සුරකින්න</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
