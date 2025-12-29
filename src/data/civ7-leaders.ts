export const CIV7_LEADERS = Object.freeze({
  LEADER_ADA_LOVELACE: 'Ada_Lovelace',
  LEADER_AMINA: 'Amina',
  LEADER_ASHOKA: 'Ashoka_World_Renouncer',
  LEADER_ASHOKA_ALT: 'Ashoka_World_Conqueror',
  LEADER_AUGUSTUS: 'Augustus',
  LEADER_BENJAMIN_FRANKLIN: 'Benjamin_Franklin',
  LEADER_BOLIVAR: 'Simon_Bolvar',
  LEADER_CATHERINE: 'Catherine_the_Great',
  LEADER_CHARLEMAGNE: 'Charlemagne',
  LEADER_CONFUCIUS: 'Confucius',
  LEADER_EDWARD_TEACH: 'Edward_Teach',
  LEADER_FRIEDRICH: 'Friedrich_Oblique',
  LEADER_FRIEDRICH_ALT: 'Friedrich_Baroque',
  LEADER_GENGHIS_KHAN: 'GenghisKhan',
  LEADER_HARRIET_TUBMAN: 'Harriet_Tubman',
  LEADER_HATSHEPSUT: 'Hatshepsut',
  LEADER_HIMIKO: 'Himiko_Queen_of_Wa',
  LEADER_HIMIKO_ALT: 'Himiko_High_Shaman',
  LEADER_IBN_BATTUTA: 'Ibn_Battuta',
  LEADER_ISABELLA: 'Isabella',
  LEADER_JOSE_RIZAL: 'Jos',
  LEADER_LAFAYETTE: 'Lafayette',
  LEADER_LAKSHMIBAI: 'Lakshmibai',
  LEADER_MACHIAVELLI: 'Machiavelli',
  LEADER_NAPOLEON: 'Napoleon_Emperor',
  LEADER_NAPOLEON_ALT: 'Napoleon_Revolutionary',
  LEADER_PACHACUTI: 'Pachacuti',
  LEADER_SAYYIDA_AL_HURRA: 'Sayyida_al_Hurra',
  LEADER_TECUMSEH: 'Tecumseh',
  LEADER_TRUNG_TRAC: 'Trung_Trac',
  LEADER_XERXES: 'Xerxes_King_of_Kings',
  LEADER_XERXES_ALT: 'Xerxes_the_Achaemenid',
} as const);

export type Civ7LeaderKey = keyof typeof CIV7_LEADERS;

export const lookupCiv7Leader = (key: string): string =>
  CIV7_LEADERS[key as Civ7LeaderKey] ?? key;