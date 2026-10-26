'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  Download, 
  RotateCcw, 
  Upload, 
  Building, 
  Check,
  Scissors
} from 'lucide-react';
import { AgentRecord, SenderSettings, DEFAULT_SENDER_SETTINGS, INITIAL_AGENTS } from '@/types/agent';
import { ParcelSheetPrintView } from '@/components/ParcelSheetPrintView';
import { AgentModal } from '@/components/AgentModal';
import { SenderSettingsModal } from '@/components/SenderSettingsModal';
import { toPng } from 'html-to-image';

const LOCAL_STORAGE_AGENTS_KEY = 'parcel_agents_list_v2';
const LOCAL_STORAGE_SENDER_KEY = 'parcel_sender_settings_v2';

export default function AgentLabelsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>(INITIAL_AGENTS);
  const [senderSettings, setSenderSettings] = useState<SenderSettings>(DEFAULT_SENDER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Print slots (exactly 4 quadrants for 1 A4 sheet)
  const [slots, setSlots] = useState<(AgentRecord | null)[]>([
    INITIAL_AGENTS[0] || null, // Slot 1: Mr. Dinesh (Wattegama)
    INITIAL_AGENTS[0] || null, // Slot 2
    INITIAL_AGENTS[0] || null, // Slot 3
    INITIAL_AGENTS[0] || null, // Slot 4
  ]);

  // Modals state
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [isSenderModalOpen, setIsSenderModalOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [activeSlotPicker, setActiveSlotPicker] = useState<number | null>(null);

  // File input ref for importing JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Initial Load: Read from LocalStorage immediately, then fetch from API
  useEffect(() => {
    // Check localStorage cache
    try {
      const cachedAgents = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
      const cachedSender = localStorage.getItem(LOCAL_STORAGE_SENDER_KEY);
      if (cachedAgents) {
        const parsed = JSON.parse(cachedAgents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgents(parsed);
          const first = parsed[0];
          setSlots([first, first, first, first]);
        }
      }
      if (cachedSender) {
        const parsedSender = JSON.parse(cachedSender);
        if (parsedSender && parsedSender.name) {
          setSenderSettings(parsedSender);
        }
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    // Fetch from API
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            if (Array.isArray(json.agents) && json.agents.length > 0) {
              setAgents(json.agents);
              try {
                localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(json.agents));
              } catch (e) {}
              const first = json.agents[0];
              setSlots([first, first, first, first]);
            }
            if (json.senderSettings) {
              setSenderSettings(json.senderSettings);
              try {
                localStorage.setItem(LOCAL_STORAGE_SENDER_KEY, JSON.stringify(json.senderSettings));
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load agents from API:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Save changes to both LocalStorage and server API
  const persistChanges = async (newAgents?: AgentRecord[], newSender?: SenderSettings) => {
    const toSaveAgents = newAgents !== undefined ? newAgents : agents;
    const toSaveSender = newSender !== undefined ? newSender : senderSettings;

    // Immediately save to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(toSaveAgents));
      localStorage.setItem(LOCAL_STORAGE_SENDER_KEY, JSON.stringify(toSaveSender));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Save to server API
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: toSaveAgents,
          senderSettings: toSaveSender,
        }),
      });
      if (res.ok) {
        showToast('නියෝජිත තොරතුරු සාර්ථකව සුරකින ලදී (Saved successfully)');
      }
    } catch (err) {
      console.error('Error persisting agents to server:', err);
    }
  };

  // Filtered agent list by search term
  const filteredAgents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return agents;
    return agents.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        a.town.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q)
      );
    });
  }, [agents, searchTerm]);

  // Slot operations
  const handleAssignToSlot = (slotIdx: number, agent: AgentRecord) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIdx] = agent;
      return copy;
    });
    setActiveSlotPicker(null);
  };

  const handleFillAllSlots = (agent: AgentRecord) => {
    setSlots([agent, agent, agent, agent]);
  };

  const handleAddToNextSlot = (agent: AgentRecord) => {
    setSlots((prev) => {
      const copy = [...prev];
      const emptyIdx = copy.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        copy[emptyIdx] = agent;
      } else {
        copy[0] = agent;
      }
      return copy;
    });
  };

  const handleClearSlot = (slotIdx: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIdx] = null;
      return copy;
    });
  };

  const handleClearAllSlots = () => {
    setSlots([null, null, null, null]);
  };

  // Agent CRUD
  const handleSaveAgent = (agentData: Partial<AgentRecord>) => {
    if (editingAgent) {
      // Update existing agent
      const updated = agents.map((a) =>
        a.id === editingAgent.id ? ({ ...a, ...agentData, updatedAt: new Date().toISOString() } as AgentRecord) : a
      );
      setAgents(updated);
      persistChanges(updated);
      // Update in active slots
      setSlots((prev) =>
        prev.map((s) => (s && s.id === editingAgent.id ? ({ ...s, ...agentData } as AgentRecord) : s))
      );
    } else {
      // Create and save new agent
      const newAgent: AgentRecord = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: agentData.name || '',
        town: agentData.town || '',
        phone: agentData.phone || '',
        createdAt: new Date().toISOString(),
      };
      const updated = [newAgent, ...agents];
      setAgents(updated);
      persistChanges(updated);
      // Auto-assign to next slot
      handleAddToNextSlot(newAgent);
    }
    setEditingAgent(null);
  };

  const handleDeleteAgent = (id: string) => {
    if (confirm('මෙම අලෙවි නියෝජිතයා ලැයිස්තුවෙන් ඉවත් කිරීමට අවශ්‍යද?')) {
      const updated = agents.filter((a) => a.id !== id);
      setAgents(updated);
      persistChanges(updated);
      setSlots((prev) => prev.map((s) => (s && s.id === id ? null : s)));
    }
  };

  const handleSaveSender = (newSettings: SenderSettings) => {
    setSenderSettings(newSettings);
    persistChanges(undefined, newSettings);
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Download Image (PNG)
  const handleExportPng = async () => {
    const el = document.getElementById('parcel-a4-sheet');
    if (!el) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `parcel-labels-a4-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('රූපය බාගත කිරීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const backupData = {
      agents,
      senderSettings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.agents)) {
          setAgents(parsed.agents);
          if (parsed.senderSettings) setSenderSettings(parsed.senderSettings);
          persistChanges(parsed.agents, parsed.senderSettings);
          alert('නියෝජිත තොරතුරු සාර්ථකව ආයාත කරන ලදී! (Backup imported successfully)');
        }
      } catch (err) {
        alert('ගොනුව කියවීමට නොහැකි විය. කරුණාකර වලංගු JSON ගොනුවක් තෝරන්න.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 no-print font-sinhala">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Scoped Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: 297mm 210mm landscape !important;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 297mm !important;
            height: 210mm !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Top Header Navigation (No-Print) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs no-print">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Result Sheet Generator"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">ප්‍රතිඵල පුවරුව (Results)</span>
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                ලේ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight font-sinhala">
                    පාර්සල් ලේබල් මුද්‍රණය (Parcel Labels)
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    A4 = ලේබල් 4ක් (1/4 Size)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-none mt-0.5 font-sinhala">
                  නියෝජිත පාර්සල් සඳහා 1/4 ප්‍රමාණයේ මුද්‍රණ ස්ලිප්
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            
            {/* Sender Settings Button */}
            <button
              type="button"
              onClick={() => setIsSenderModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs"
              title="Edit Sender / Dealer details printed on the label"
            >
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline font-sinhala">යවන්නාගේ විස්තර</span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(Sender)</span>
            </button>

            {/* Export PNG */}
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExportingImage}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs"
              title="Download sheet as high-res PNG image"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Export PNG</span>
            </button>

            {/* Main Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              title="Print standard A4 Landscape Sheet (4 Slips)"
            >
              <Printer className="w-4 h-4" />
              <span className="font-sinhala">A4 පත්‍රය මුද්‍රණය (Print 4)</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Body Workspace (No-Print on Sidebar) */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Panel: Agent Directory & Selector (No-Print) */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4 no-print">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
            
            {/* Panel Title & Add Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 font-sinhala">
                  අලෙවි නියෝජිතයින් ({filteredAgents.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAgent(null);
                  setIsAgentModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-sinhala">නව නියෝජිතයෙක්</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="නම, නගරය හෝ දුරකථන අංකය සොයන්න..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala bg-slate-50/60"
              />
            </div>

            {/* Backup actions */}
            <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
              <span className="text-[11px] font-sinhala mr-auto">බැකප්:</span>
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                title="Export Backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                title="Import Backup (JSON)"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />
            </div>

            {/* Agent List */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2 pr-1">
              {filteredAgents.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-sinhala">
                  නියෝජිතයින් හමු නොවීය.
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => handleFillAllSlots(agent)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                    title="පත්‍රය මෙම නියෝජිතයාගෙන් පිරවීමට ක්ලික් කරන්න"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-slate-900 font-sinhala truncate block">
                        {agent.name}
                      </span>
                      <p className="text-xs text-slate-600 font-sinhala mt-0.5">
                        {agent.town}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {agent.phone}
                      </p>
                    </div>

                    {/* Edit & Delete Icons */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAgent(agent);
                          setIsAgentModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition"
                        title="සංස්කරණය කරන්න"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="ඉවත් කරන්න"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

        {/* Right Panel: Live A4 Print Sheet Preview */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-4 items-center">
          
          {/* Sheet Toolbar (No-Print) */}
          <div className="w-full max-w-[1050px] bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-800 font-sinhala">
                A4 මුද්‍රණ පෙරදසුන (Landscape 297mm × 210mm)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                • 4 Parcel Slips (1/4 A4 each)
              </span>
            </div>

            <div className="flex items-center gap-2">
              
              <button
                type="button"
                onClick={handleClearAllSlots}
                className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition font-sinhala flex items-center gap-1"
                title="Clear all 4 slots"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>හිස් කරන්න</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs transition font-sinhala cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>මුද්‍රණය කරන්න (Print)</span>
              </button>

            </div>

          </div>

          {/* The A4 Sheet Component */}
          <ParcelSheetPrintView
            slots={slots}
            sender={senderSettings}
            onSelectSlot={(idx) => setActiveSlotPicker(idx)}
            onClearSlot={handleClearSlot}
            onEditAgent={(agent) => {
              setEditingAgent(agent);
              setIsAgentModalOpen(true);
            }}
            onDuplicateSlot={handleFillAllSlots}
          />

          {/* Helpful printing guide tip for user */}
          <div className="w-full max-w-[1050px] bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5 no-print font-sinhala">
            <Scissors className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">මුද්‍රණ උපදෙස් (Printing Advice):</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                සාමාන්‍ය A4 කඩදාසියක් Print කර මැද ඇති කඩ ඉරි ඔස්සේ කොටස් 4කට කපාගන්න. එක් ලේබලයක් නියෝජිත පාර්සලයේ අලවන්න.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Quick Agent Slot Picker Modal (When clicking an empty slot) */}
      {activeSlotPicker !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-sinhala">
                කොටස {activeSlotPicker + 1} සඳහා අලෙවි නියෝජිතයෙකු තෝරන්න
              </h3>
              <button
                type="button"
                onClick={() => setActiveSlotPicker(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {agents.map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleAssignToSlot(activeSlotPicker, a)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-900 font-sinhala">{a.name}</p>
                    <p className="text-xs text-slate-600 font-sinhala">{a.town} • {a.phone}</p>
                  </div>
                  <button className="px-2.5 py-1 text-xs bg-blue-600 text-white font-medium rounded-lg font-sinhala">
                    තෝරන්න
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AgentModal
        isOpen={isAgentModalOpen}
        agent={editingAgent}
        onClose={() => {
          setIsAgentModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSaveAgent}
      />

      <SenderSettingsModal
        isOpen={isSenderModalOpen}
        settings={senderSettings}
        onClose={() => setIsSenderModalOpen(false)}
        onSave={handleSaveSender}
      />

    </div>
  );
}
