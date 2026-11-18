// 軍師戰棋 — 兵種、武將、計策與關卡資料
import type { General, Level, SquadSpec, TacticId, UnitStats, UnitType } from './types'

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  spear: {
    name: '槍兵', char: '槍', troops: 100, atk: 5, def: 0.15, speed: 1.0, range: 0.95, cooldown: 1,
    desc: '攻守平均，長槍專門對付騎兵。',
  },
  archer: {
    name: '弓兵', char: '弓', troops: 80, atk: 4.5, def: 0, speed: 0.9, range: 4, cooldown: 1.2,
    desc: '能從 4 格外放箭，專剋槍兵；被近身就很弱。',
  },
  cavalry: {
    name: '騎兵', char: '騎', troops: 80, atk: 5.5, def: 0.1, speed: 2.0, range: 0.95, cooldown: 1,
    desc: '跑得最快，衝鋒的第一擊特別痛，專剋弓兵。',
  },
  shield: {
    name: '盾兵', char: '盾', troops: 120, atk: 3, def: 0.3, speed: 0.75, range: 0.95, cooldown: 1,
    desc: '最耐打，弓箭幾乎射不穿；但走得慢、攻擊弱。',
  },
}

/** 攻擊方 → 防守方的傷害倍率，沒列出的是 1 */
export const COUNTER: Record<UnitType, Partial<Record<UnitType, number>>> = {
  spear: { cavalry: 1.6 },
  cavalry: { archer: 1.6, shield: 0.7 },
  archer: { spear: 1.4, shield: 0.4 },
  shield: {},
}

export const COUNTER_TIPS = ['槍剋騎', '騎剋弓', '弓剋槍', '盾擋箭']

export const GENERALS: Record<string, General> = {
  liubei: { name: '劉備', char: '劉', atk: 1.1, def: 0.1 },
  guanyu: { name: '關羽', char: '關', atk: 1.4, def: 0.1 },
  zhangfei: { name: '張飛', char: '張', atk: 1.35, def: 0.08 },
  zhaoyun: { name: '趙雲', char: '趙', atk: 1.3, def: 0.12 },
  huangzhong: { name: '黃忠', char: '黃', atk: 1.4, def: 0 },
  yujin: { name: '于禁', char: '于', atk: 1.15, def: 0.1 },
  xiahoudun: { name: '夏侯惇', char: '夏', atk: 1.3, def: 0.08 },
  caochun: { name: '曹純', char: '純', atk: 1.25, def: 0.1 },
  xuchu: { name: '許褚', char: '許', atk: 1.3, def: 0.1 },
  lidian: { name: '李典', char: '李', atk: 1.15, def: 0.1 },
  dianwei: { name: '典韋', char: '典', atk: 1.3, def: 0.12 },
  caocao: { name: '曹操', char: '曹', atk: 1.2, def: 0.12 },
}

export interface TacticInfo {
  name: string
  icon: string
  desc: string
  radius: number // 0 表示不用選位置
}

export const TACTICS: Record<TacticId, TacticInfo> = {
  fire: { name: '火計', icon: '🔥', desc: '點選位置放火，燒傷範圍內敵軍；敵軍在樹林裡燒得更重。', radius: 1.5 },
  confuse: { name: '擾亂', icon: '🌀', desc: '點選位置，範圍內敵軍陷入混亂，5 秒不能行動。', radius: 1.8 },
  rally: { name: '鼓舞', icon: '📯', desc: '全軍攻擊力提升，持續 10 秒。', radius: 0 },
}

export const GENERAL_TROOPS = 20
export const COMMANDER_TROOPS = 40

export const maxTroopsOf = (spec: SquadSpec) =>
  UNIT_STATS[spec.type].troops + (spec.general ? GENERAL_TROOPS : 0) + (spec.commander ? COMMANDER_TROOPS : 0)

export const bannerChar = (spec: SquadSpec) => (spec.general ? GENERALS[spec.general].char : UNIT_STATS[spec.type].char)

export const squadName = (spec: SquadSpec) =>
  spec.general ? `${GENERALS[spec.general].name}（${UNIT_STATS[spec.type].name}）` : UNIT_STATS[spec.type].name

export const shortName = (spec: SquadSpec) => (spec.general ? GENERALS[spec.general].name : UNIT_STATS[spec.type].name)

export const LEVELS: Level[] = [
  {
    name: '初陣・新野郊外',
    story: '于禁率軍來犯新野。軍師初次上陣，先熟悉佈陣與兵種相剋。',
    hint: '敵軍大多是槍兵，弓兵專剋槍兵，擺在後面放箭最有效。主帥（★）放最後面保護好，擊破敵方主帥就贏了！',
    map: [
      '................',
      '................',
      '..T..........T..',
      '................',
      '................',
      '................',
      '................',
      '..T..........T..',
      '................',
      '................',
    ],
    roster: [
      { type: 'spear', general: 'liubei', commander: true },
      { type: 'spear' },
      { type: 'spear' },
      { type: 'archer' },
      { type: 'cavalry' },
    ],
    enemies: [
      { type: 'spear', x: 11, y: 3 },
      { type: 'spear', x: 11, y: 6 },
      { type: 'archer', x: 13, y: 4 },
      { type: 'spear', general: 'yujin', commander: true, x: 14, y: 5, stance: 'hold' },
    ],
    tactics: ['rally'],
    timeLimit: 150,
  },
  {
    name: '博望坡・火燒林道',
    story: '夏侯惇的騎兵沿著林道殺來。兩旁樹林茂密，正是用火的好地方。',
    hint: '敵軍騎兵很多，用槍兵擋在前面。等敵軍走進樹林，再用火計，燒得特別重！',
    map: [
      '................',
      '.....TTTTTT.....',
      '.....TTTTTT.....',
      '.....TTTTTT.....',
      '................',
      '................',
      '.....TTTTTT.....',
      '.....TTTTTT.....',
      '.....TTTTTT.....',
      '................',
    ],
    roster: [
      { type: 'spear', general: 'liubei', commander: true },
      { type: 'spear', general: 'zhangfei' },
      { type: 'spear' },
      { type: 'archer' },
      { type: 'archer' },
    ],
    enemies: [
      { type: 'cavalry', x: 12, y: 4 },
      { type: 'cavalry', x: 12, y: 5 },
      { type: 'cavalry', x: 13, y: 2 },
      { type: 'cavalry', x: 13, y: 7 },
      { type: 'spear', x: 14, y: 3 },
      { type: 'archer', x: 14, y: 6 },
      { type: 'cavalry', general: 'xiahoudun', commander: true, x: 15, y: 5, stance: 'hold' },
    ],
    tactics: ['fire', 'rally'],
    timeLimit: 150,
  },
  {
    name: '長坂・斷橋',
    story: '曹軍精銳騎兵追來，大河只有兩座橋可以過。守住橋頭，就能以少擊多。',
    hint: '河只能從橋上過。把部隊設成「固守」守在橋頭，弓兵站在河邊可以隔河放箭。',
    map: [
      '.......~~.......',
      '.......~~.......',
      '.......==.......',
      '.......~~.......',
      '..T....~~....T..',
      '..T....~~....T..',
      '.......~~.......',
      '.......==.......',
      '.......~~.......',
      '.......~~.......',
    ],
    roster: [
      { type: 'spear', general: 'liubei', commander: true },
      { type: 'spear', general: 'zhangfei' },
      { type: 'cavalry', general: 'zhaoyun' },
      { type: 'spear' },
      { type: 'archer' },
      { type: 'archer' },
    ],
    enemies: [
      { type: 'cavalry', x: 11, y: 2 },
      { type: 'cavalry', general: 'xiahoudun', x: 11, y: 7 },
      { type: 'cavalry', general: 'xuchu', x: 12, y: 4 },
      { type: 'spear', x: 12, y: 5 },
      { type: 'archer', x: 13, y: 3 },
      { type: 'archer', x: 13, y: 6 },
      { type: 'spear', general: 'caochun', commander: true, x: 15, y: 4, stance: 'hold' },
    ],
    tactics: ['confuse', 'rally'],
    timeLimit: 150,
  },
  {
    name: '伏兵之谷',
    story: '李典在谷中樹林埋伏了弓兵，正面還有盾兵推進。小心別一頭撞進埋伏。',
    hint: '中間樹林藏著伏兵（固守的敵軍），靠近才會現身。先用火計燒樹林、或用擾亂定住他們，再讓大軍衝過去。',
    map: [
      'TTTT........TTTT',
      'TTT..........TTT',
      '................',
      '.......TT.......',
      '......TTTT......',
      '......TTTT......',
      '.......TT.......',
      '................',
      'TTT..........TTT',
      'TTTT........TTTT',
    ],
    roster: [
      { type: 'spear', general: 'liubei', commander: true },
      { type: 'cavalry', general: 'guanyu' },
      { type: 'cavalry', general: 'zhaoyun' },
      { type: 'spear' },
      { type: 'archer' },
      { type: 'archer' },
    ],
    enemies: [
      { type: 'archer', x: 7, y: 4, stance: 'hold' },
      { type: 'archer', x: 8, y: 5, stance: 'hold' },
      { type: 'spear', x: 8, y: 4, stance: 'hold' },
      { type: 'shield', x: 12, y: 3 },
      { type: 'shield', x: 12, y: 6 },
      { type: 'cavalry', x: 12, y: 1 },
      { type: 'cavalry', x: 12, y: 8 },
      { type: 'archer', x: 14, y: 2 },
      { type: 'spear', x: 14, y: 7 },
      { type: 'spear', general: 'lidian', commander: true, x: 14, y: 4, stance: 'hold' },
    ],
    tactics: ['fire', 'confuse', 'rally'],
    timeLimit: 150,
  },
  {
    name: '決戰・漢水',
    story: '曹操親率大軍，典韋、許褚、夏侯惇隨行。三座橋、兩岸樹林，一戰定天下。',
    hint: '敵方主帥曹操守在最後面。善用三種計策，集中兵力從一座橋突破！',
    map: [
      '.......~~.......',
      '.......==.......',
      '..TT...~~...TT..',
      '..TT...~~...TT..',
      '.......~~.......',
      '.......==.......',
      '.......~~.......',
      '.TT....~~....TT.',
      '.......==.......',
      '.......~~.......',
    ],
    roster: [
      { type: 'spear', general: 'liubei', commander: true },
      { type: 'cavalry', general: 'guanyu' },
      { type: 'spear', general: 'zhangfei' },
      { type: 'cavalry', general: 'zhaoyun' },
      { type: 'archer', general: 'huangzhong' },
      { type: 'archer' },
      { type: 'shield' },
      { type: 'spear' },
    ],
    enemies: [
      { type: 'cavalry', general: 'xuchu', x: 11, y: 1 },
      { type: 'cavalry', general: 'xiahoudun', x: 11, y: 8 },
      { type: 'spear', x: 11, y: 4 },
      { type: 'shield', x: 11, y: 6 },
      { type: 'archer', x: 13, y: 3 },
      { type: 'archer', x: 13, y: 7 },
      { type: 'spear', general: 'dianwei', x: 13, y: 5 },
      { type: 'spear', x: 12, y: 2 },
      { type: 'shield', x: 12, y: 7 },
      { type: 'archer', x: 14, y: 5 },
      { type: 'spear', general: 'caocao', commander: true, x: 15, y: 5, stance: 'hold' },
    ],
    tactics: ['fire', 'confuse', 'rally'],
    timeLimit: 180,
  },
]
