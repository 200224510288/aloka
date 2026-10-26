export interface AgentRecord {
  id: string;
  name: string;           // e.g. "දිනේෂ් මහතා"
  town: string;           // e.g. "වත්තේගම"
  phone: string;          // e.g. "0773002230"
  route?: string;         // e.g. "නුවර - වත්තේගම බස් රථය" (optional)
  notes?: string;         // optional notes
  isFavorite?: boolean;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SenderSettings {
  name: string;           // "S.W ඔස්මන් ද සිල්වා"
  designation: string;    // "ලොතරැයි දිස්ත්‍රික් අලෙවි නියෝජිත,"
  address: string;        // "204, මධ්‍යම වෙළඳපල, මහනුවර."
  phone: string;          // "081-2223306 / 0777803096"
  centerNote: string;     // "ලබා දෙන්න."
}

export interface PrintSheetState {
  slots: (AgentRecord | null)[]; // exactly 4 items for 1 A4 sheet
}

export const DEFAULT_SENDER_SETTINGS: SenderSettings = {
  name: 'S . W ඔස්මන් ද සිල්වා',
  designation: 'ලොතරැයි දිස්ත්‍රික් අලෙවි නියෝජිත,',
  address: '204, මධ්‍යම වෙළඳපල, මහනුවර.',
  phone: '081-2223306 / 0777803096',
  centerNote: 'ලබා දෙන්න.',
};

export const INITIAL_AGENTS: AgentRecord[] = [
  {
    id: 'agent_dinesh_wattegama',
    name: 'දිනේෂ් මහතා',
    town: 'වත්තේගම',
    phone: '0773002230',
    isFavorite: true,
    orderIndex: 0,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'agent_priyantha_katugastota',
    name: 'ප්‍රියන්ත මහතා',
    town: 'කටුගස්තොට',
    phone: '0771234567',
    isFavorite: true,
    orderIndex: 1,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'agent_bandara_akurana',
    name: 'බණ්ඩාර මහතා',
    town: 'අකුරණ',
    phone: '0714567890',
    isFavorite: false,
    orderIndex: 2,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'agent_sunil_thennekumbura',
    name: 'සුනිල් මහතා',
    town: 'තැන්නෙකුඹුර',
    phone: '0782345678',
    isFavorite: false,
    orderIndex: 3,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'agent_kumara_gampola',
    name: 'කුමාර මහතා',
    town: 'ගම්පොල',
    phone: '0769876543',
    isFavorite: false,
    orderIndex: 4,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'agent_sampath_kundasale',
    name: 'සම්පත් මහතා',
    town: 'කුණ්ඩසාලේ',
    phone: '0703456789',
    isFavorite: false,
    orderIndex: 5,
    createdAt: '2026-10-26T00:00:00.000Z',
  },
];
