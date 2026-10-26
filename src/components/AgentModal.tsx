'use client';

import React, { useState, useEffect } from 'react';
import { AgentRecord } from '@/types/agent';
import { X, Save, Sparkles, User, MapPin, Phone, FileText } from 'lucide-react';
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
  const [route, setRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setTown(agent.town || '');
      setPhone(agent.phone || '');
      setRoute(agent.route || '');
      setNotes(agent.notes || '');
      setIsFavorite(Boolean(agent.isFavorite));
    } else {
      setName('');
      setTown('');
      setPhone('');
      setRoute('');
      setNotes('');
      setIsFavorite(false);
    }
  }, [agent, isOpen]);

  if (!isOpen) return null;

  const handleTransliterateName = () => {
    if (hasEnglishLetters(name)) {
      setName(transliterateSinglish(name));
    }
  };

  const handleTransliterateTown = () => {
    if (hasEnglishLetters(town)) {
      setTown(transliterateSinglish(town));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalName = hasEnglishLetters(name.trim()) ? transliterateSinglish(name.trim()) : name.trim();
    const finalTown = hasEnglishLetters(town.trim()) ? transliterateSinglish(town.trim()) : town.trim();

    onSave({
      name: finalName,
      town: finalTown,
      phone: phone.trim(),
      route: route.trim() || undefined,
      notes: notes.trim() || undefined,
      isFavorite,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-sinhala">
                {agent ? 'අලෙවි නියෝජිත සංස්කරණය' : 'නව අලෙවි නියෝජිතයෙකු ඇතුළත් කරන්න'}
              </h3>
              <p className="text-xs text-slate-400">
                {agent ? 'Edit agent details' : 'Add new agent for parcel labels'}
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
          
          {/* Agent Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              අලෙවි නියෝජිත නම (Agent Name) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="උදා: දිනේෂ් මහතා / Dinesh mahatha"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
              />
              {hasEnglishLetters(name) && (
                <button
                  type="button"
                  onClick={handleTransliterateName}
                  className="absolute right-2 top-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-bold flex items-center gap-1 hover:bg-blue-100"
                  title="Singlish to Sinhala"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>සිංහල</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-sinhala">
              සිංහලෙන් හෝ ඉංග්‍රීසියෙන් (Singlish) ටයිප් කළ හැක
            </p>
          </div>

          {/* Town / Destination */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              නගරය / ප්‍රදේශය (Town / Area) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="උදා: වත්තේගම / Wattegama"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
              />
              {hasEnglishLetters(town) && (
                <button
                  type="button"
                  onClick={handleTransliterateTown}
                  className="absolute right-2 top-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-bold flex items-center gap-1 hover:bg-blue-100"
                  title="Singlish to Sinhala"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>සිංහල</span>
                </button>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              දුරකථන අංකය (Phone Number) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="උදා: 0773002230 / 081-2223306"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Optional Route / Bus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              බස් රථය / බෙදාහැරීමේ මාර්ගය (Route / Bus - Optional)
            </label>
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="උදා: මහනුවර - වත්තේගම බස් රථය"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
            />
          </div>

          {/* Favorite checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="agent-favorite"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="agent-favorite" className="text-xs font-bold text-slate-700 font-sinhala cursor-pointer">
              නිතර භාවිතා කරන නියෝජිතයින් අතරට එක් කරන්න (Pin to Favorites)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition flex items-center gap-2"
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
