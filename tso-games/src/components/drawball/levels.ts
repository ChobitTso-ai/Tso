// 畫線滾球 — 關卡資料（座標以 800×500 畫布為準）
import type { Goal, Level, Segment } from './types'

export const LEVELS: Level[] = [
  {
    name: '第一條線',
    hint: '在球的下方畫一條斜坡，讓球滾進綠色杯子！',
    start: { x: 120, y: 80 },
    goal: { x: 620, y: 400, w: 80, h: 50 },
    walls: [],
    spikes: [],
    inkLimit: 800,
  },
  {
    name: '跨越深谷',
    hint: '球會滑下平台，畫一座橋讓它過到對面。',
    start: { x: 80, y: 150 },
    goal: { x: 660, y: 360, w: 80, h: 50 },
    walls: [
      { a: { x: 40, y: 190 }, b: { x: 260, y: 240 } },
      // 杯口與右側平台齊平，球沿平台滾過去就會掉進杯子
      { a: { x: 560, y: 360 }, b: { x: 660, y: 360 } },
      { a: { x: 740, y: 360 }, b: { x: 790, y: 360 } },
    ],
    spikes: [],
    inkLimit: 450,
  },
  {
    name: '翻過高牆',
    hint: '杯子在高牆的另一邊，想辦法讓球飛過去或繞過去。',
    start: { x: 680, y: 60 },
    goal: { x: 130, y: 420, w: 80, h: 50 },
    walls: [{ a: { x: 420, y: 180 }, b: { x: 420, y: 500 } }],
    spikes: [],
    inkLimit: 900,
  },
  {
    name: '小心尖刺',
    hint: '地上全是尖刺！杯子懸在半空中，別讓球掉下去。',
    start: { x: 100, y: 60 },
    goal: { x: 600, y: 220, w: 90, h: 50 },
    walls: [],
    spikes: [
      { a: { x: 0, y: 490 }, b: { x: 800, y: 490 } },
      { a: { x: 350, y: 0 }, b: { x: 350, y: 110 } },
    ],
    inkLimit: 900,
  },
  {
    name: '之字挑戰',
    hint: '先按「放球」，球滾下斜台後要趕快畫線接住它！',
    start: { x: 560, y: 100 },
    goal: { x: 670, y: 420, w: 100, h: 50 },
    walls: [{ a: { x: 150, y: 200 }, b: { x: 800, y: 140 } }],
    spikes: [
      { a: { x: 150, y: 490 }, b: { x: 660, y: 490 } },
      { a: { x: 450, y: 182 }, b: { x: 450, y: 300 } },
    ],
    inkLimit: 1100,
  },
]

/** 杯子的左、底、右三面牆，球只能從上方進入 */
export function cupWalls(g: Goal): Segment[] {
  const bl = { x: g.x, y: g.y + g.h }
  const br = { x: g.x + g.w, y: g.y + g.h }
  return [
    { a: { x: g.x, y: g.y }, b: bl },
    { a: bl, b: br },
    { a: br, b: { x: g.x + g.w, y: g.y } },
  ]
}
