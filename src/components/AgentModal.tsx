'use client';

import React, { useState, useEffect } from 'react';
import { AgentRecord } from '@/types/agent';
import { X, Save, User } from 'lucide-react';
import { transliterateSinglish, hasEnglishLetters } from '@/lib/singlish';

interface AgentModalProps {
  isOpen: boolean;
  agent: AgentRecord | null;
  onClose: () => void;
  onSave: (agent: Partial<AgentRecord>) => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  agent,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [town, setTown] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setTown(agent.town || '');
      setPhone(agent.phone || '');
    } else {
      setName('');
      setTown('');
      setPhone('');
    }
  }, [agent, isOpen]);

  if (!isOpen) return null;

  // Auto-transliterate Singlish to Sinhala when typing
  const handleNameChange = (val: string) => {
    setName(val);
  };

  const handleNameBlur = () => {
    if (hasEnglishLetters(name)) {
      setName(transliterateSinglish(name));
    }
  };

  const handleTownChange = (val: string) => {
    setTown(val);
  };

  const handleTownBlur = () => {
    if (hasEnglishLetters(town)) {
      setTown(transliterateSinglish(town));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Guarantee final output is Sinhala only
    const finalName = hasEnglishLetters(name.trim()) ? transliterateSinglish(name.trim()) : name.trim();
    const finalTown = hasEnglishLetters(town.trim()) ? transliterateSinglish(town.trim()) : town.trim();

    onSave({
      name: finalName,
      town: finalTown,
      phone: phone.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Sinhala Only */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight font-sinhala">
                {agent ? 'අලෙවි නියෝජිත සංස්කරණය' : 'නව අලෙවි නියෝජිතයෙකු ඇතුළත් කිරීම'}
              </h3>
              <p className="text-xs text-slate-400 font-sinhala">
                {agent ? 'නියෝජිත තොරතුරු සංස්කරණය කරන්න' : 'පාර්සල් ලේබලය සඳහා තොරතුරු ඇතුළත් කරන්න'}
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

        {/* Form Body - Sinhala Only */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              අලෙවි නියෝජිත නම <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="උදා: දිනේෂ් මහතා"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
              autoFocus
            />
          </div>

          {/* Town / Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              නගරය / ප්‍රදේශය <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={town}
              onChange={(e) => handleTownChange(e.target.value)}
              onBlur={handleTownBlur}
              placeholder="උදා: වත්තේගම"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              දුරකථන අංකය <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="උදා: 0773002230"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Buttons - Sinhala Only */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition font-sinhala"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition flex items-center gap-2 font-sinhala"
            >
              <Save className="w-4 h-4" />
              <span>{agent ? 'යාවත්කාලීන කරන්න' : 'සුරකින්න'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
