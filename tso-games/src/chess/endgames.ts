import type { Color } from './types'

export type GoalType = '白方獲勝' | '黑方獲勝' | '和棋'

export interface EndgamePosition {
  id: number
  name: string
  category: string
  fen: string
  goal: GoalType
  difficulty: 1 | 2 | 3
  hint: string
  playerColor: Color
}

export const CATEGORIES = ['兵局', '車局', '象局', '馬局', '后局', '複合殘局'] as const

export const ENDGAME_POSITIONS: EndgamePosition[] = [
  // ===== 兵局 (20) =====
  {
    id: 1, category: '兵局', name: '王在兵前（六排）', difficulty: 1,
    fen: '8/8/4K3/4P3/8/4k3/8/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白王已在兵的正前方（第六排），直接推進即可',
  },
  {
    id: 2, category: '兵局', name: '對立爭奪——e兵', difficulty: 2,
    fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白方需靠邊繞開黑王，取得對立後推進',
  },
  {
    id: 3, category: '兵局', name: 'a邊兵——和棋', difficulty: 1,
    fen: 'k7/8/K7/P7/8/8/8/8 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '黑王只需守住 a8 角落，白方無法突破',
  },
  {
    id: 4, category: '兵局', name: 'h邊兵——逼和陷阱', difficulty: 1,
    fen: '7k/8/6KP/8/8/8/8/8 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '黑王回到 h8，讓白方陷入逼和困局',
  },
  {
    id: 5, category: '兵局', name: 'd兵關鍵格', difficulty: 1,
    fen: '8/8/3K4/3P4/8/3k4/8/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'd5兵的關鍵格是 c6、d6、e6——白王要搶先到達',
  },
  {
    id: 6, category: '兵局', name: 'f兵——對立', difficulty: 2,
    fen: '8/8/8/5k2/8/5K2/5P2/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白王要繞到 f4—f5，取得前方對立',
  },
  {
    id: 7, category: '兵局', name: 'b邊兵——白贏', difficulty: 2,
    fen: '8/8/8/1k6/8/1K6/1P6/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'b兵不是邊兵，白方應能獲勝——搶關鍵格',
  },
  {
    id: 8, category: '兵局', name: '兵的賽跑', difficulty: 2,
    fen: '8/p7/8/8/8/8/P7/k1K5 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '計算哪方兵先升變，並考慮升變後能否阻擋對方',
  },
  {
    id: 9, category: '兵局', name: '遠距對立', difficulty: 2,
    fen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白方要先取遠距對立，再逼近',
  },
  {
    id: 10, category: '兵局', name: '方格法則', difficulty: 1,
    fen: '8/8/8/8/p7/8/8/4K3 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑王是否在兵的"方格"內？若是，黑王可追上兵',
  },
  {
    id: 11, category: '兵局', name: '兵突破——三對三', difficulty: 3,
    fen: '8/ppp5/8/PPP5/8/8/8/3k1K2 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '利用兵的犧牲突破，製造一個通路兵',
  },
  {
    id: 12, category: '兵局', name: '外圍通路兵', difficulty: 2,
    fen: '8/8/8/8/2P5/2K5/8/2k5 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '遠距通路兵吸引黑王，白王從另一側突破',
  },
  {
    id: 13, category: '兵局', name: '雙兵對單兵', difficulty: 2,
    fen: '8/8/8/8/k7/p7/PP6/K7 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩個連通兵通常能擊敗單個通路兵',
  },
  {
    id: 14, category: '兵局', name: '黑兵升變護送', difficulty: 1,
    fen: '4K3/4k3/8/8/8/8/4p3/8 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑王護送兵到升變，同時阻擋白王',
  },
  {
    id: 15, category: '兵局', name: '三兵對兩兵——多數兵', difficulty: 3,
    fen: '8/8/8/3k4/3ppp2/3PPP2/8/3K4 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '兩邊兵力均等，正確防守可以和棋',
  },
  {
    id: 16, category: '兵局', name: '側翼繞攻', difficulty: 3,
    fen: '8/8/8/2k1p3/4P3/4K3/8/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '勿急著吃兵，繞道側翼讓黑王顧此失彼',
  },
  {
    id: 17, category: '兵局', name: '對稱位置和棋', difficulty: 2,
    fen: '8/8/8/8/8/p7/P7/kK6 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '白方無法突破對稱防守，正確應對即可和棋',
  },
  {
    id: 18, category: '兵局', name: 'c兵升變', difficulty: 2,
    fen: '8/8/8/8/8/2k5/2p5/2K5 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑王要掌握兵的前進路線，阻擋白王介入',
  },
  {
    id: 19, category: '兵局', name: '阻擋兵（對攻）', difficulty: 3,
    fen: '8/8/8/p7/P7/8/8/Kk6 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '互相阻擋的兵型通常導致和棋',
  },
  {
    id: 20, category: '兵局', name: '兵的升變——後手', difficulty: 2,
    fen: '8/3p4/3k4/8/8/3K4/3P4/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白方能否阻止黑方 d 兵並推進自己的 d 兵？',
  },

  // ===== 車局 (25) =====
  {
    id: 21, category: '車局', name: '車王殺局——基礎', difficulty: 1,
    fen: '8/8/8/8/8/3K4/8/R6k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '用車將黑王限制在邊緣，再配合王將軍',
  },
  {
    id: 22, category: '車局', name: 'Lucena位置', difficulty: 3,
    fen: '1K1k4/1P6/8/8/8/8/8/2R5 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'Lucena勝法：車建橋（bridge building）掩護白王脫離',
  },
  {
    id: 23, category: '車局', name: 'Philidor防守', difficulty: 3,
    fen: '4k3/8/8/3r4/8/8/3P4/3RK3 b - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: 'Philidor防守：黑車站在第三橫列切斷白王，等白王過河再到後方騷擾',
  },
  {
    id: 24, category: '車局', name: '車對通路兵——從後', difficulty: 2,
    fen: '8/8/8/8/8/k7/p7/KR6 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車從後面攻擊通路兵，黑王護兵則被將軍',
  },
  {
    id: 25, category: '車局', name: '車對a兵——和棋', difficulty: 2,
    fen: '8/p7/k7/8/8/K7/R7/8 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '黑方 a 兵在第七排，黑王靠近角落，和棋機會大',
  },
  {
    id: 26, category: '車局', name: '橫向切割', difficulty: 2,
    fen: '8/8/8/8/R7/8/4k3/4K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車橫向切割黑王，讓白王靠近後再配合',
  },
  {
    id: 27, category: '車局', name: '縱向切割', difficulty: 2,
    fen: '8/8/3k4/8/8/8/3P4/3KR3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車縱向切割黑王，白兵自由推進',
  },
  {
    id: 28, category: '車局', name: '車後置原則', difficulty: 2,
    fen: '8/8/8/3k4/3P4/8/8/R2K4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車應站在通路兵的後面，讓兵推進時車更有力',
  },
  {
    id: 29, category: '車局', name: '被動車敗局', difficulty: 3,
    fen: '3k4/3r4/8/8/3P4/3K4/8/3R4 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '黑方車被動防守，白方王+兵+車如何突破？',
  },
  {
    id: 30, category: '車局', name: '車王殺局——第七排', difficulty: 2,
    fen: '3k4/3R4/8/3K4/8/8/8/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車霸佔第七排，白王配合逼殺黑王',
  },
  {
    id: 31, category: '車局', name: '車+兵對車——勝', difficulty: 3,
    fen: '3k4/3r4/8/3K4/3P4/8/8/3R4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車+兵對車通常是勝局，但需要精確技術',
  },
  {
    id: 32, category: '車局', name: '車+兵對車——和棋', difficulty: 3,
    fen: '8/8/4k3/8/4P3/8/8/r3K2R b - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '黑車從後方不斷騷擾，防止白兵升變',
  },
  {
    id: 33, category: '車局', name: '對角逃脫', difficulty: 3,
    fen: '8/8/8/8/3k4/8/3P4/R2K4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '用車限制黑王，讓白王斜向推進',
  },
  {
    id: 34, category: '車局', name: '車的活躍性', difficulty: 2,
    fen: '8/8/8/8/8/k7/r7/K7 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑車+王積極進攻，逼白王入角',
  },
  {
    id: 35, category: '車局', name: '三個兵對車', difficulty: 2,
    fen: '8/8/8/8/2P5/1P6/P7/R3k1K1 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '多個連通兵加上車的威力無窮',
  },
  {
    id: 36, category: '車局', name: 'g兵和棋', difficulty: 2,
    fen: '8/8/8/8/8/8/6p1/R5Kk b - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: 'g兵在 g2，黑王在 h1——白車無法阻止升變嗎？',
  },
  {
    id: 37, category: '車局', name: '王的活躍性——勝', difficulty: 2,
    fen: '8/8/4k3/4P3/8/4K3/8/7R w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白王要積極參與，不能只靠車',
  },
  {
    id: 38, category: '車局', name: '前門車', difficulty: 3,
    fen: '8/8/8/8/8/2k5/2P5/2KR4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車從前方封鎖黑王，讓兵自由推進',
  },
  {
    id: 39, category: '車局', name: '雙車對王', difficulty: 1,
    fen: '3k4/8/8/8/8/8/8/RR2K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩個車交替將軍，快速逼殺',
  },
  {
    id: 40, category: '車局', name: '車+2兵對車', difficulty: 3,
    fen: '3k4/3r4/8/3K4/2PP4/8/8/3R4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '多一個兵就有勝機，但需要精確走法',
  },
  {
    id: 41, category: '車局', name: '黑車從後攻擊', difficulty: 2,
    fen: '8/3P4/8/3K4/8/3k4/8/r7 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑車從後方不斷給將，干擾白兵升變',
  },
  {
    id: 42, category: '車局', name: '兩車對兩車', difficulty: 3,
    fen: '3k4/3rr3/8/8/8/8/3RR3/3K4 w - - 0 1',
    goal: '和棋', playerColor: 'w',
    hint: '兵力相等的車局通常是和棋',
  },
  {
    id: 43, category: '車局', name: '車+3兵勝', difficulty: 2,
    fen: '3k4/8/8/8/8/8/PPP5/R3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '多個兵的優勢配合車，白方輕鬆獲勝',
  },
  {
    id: 44, category: '車局', name: '車對遠端通路兵', difficulty: 2,
    fen: '8/8/8/p7/8/8/8/KR3k2 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車從後追趕通路兵，比黑王先到達',
  },
  {
    id: 45, category: '車局', name: '時間走步（zugzwang）', difficulty: 3,
    fen: '8/8/8/3k4/3P4/8/3K4/3R4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '利用車的走步逼黑王到不利位置',
  },

  // ===== 象局 (15) =====
  {
    id: 46, category: '象局', name: '象+兵——正色', difficulty: 1,
    fen: '8/8/8/8/8/3B4/3P4/3K3k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '象與升變格同色，白方應能獲勝',
  },
  {
    id: 47, category: '象局', name: 'a兵錯色象——和棋', difficulty: 1,
    fen: '8/8/8/8/8/7k/7P/6KB1 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: 'h兵升變格是暗色，白象是亮色（錯色）——和棋',
  },
  {
    id: 48, category: '象局', name: '異色象——和棋', difficulty: 1,
    fen: '8/3k4/3p4/8/8/3P4/3K4/3b4 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '異色象殘局幾乎總是和棋',
  },
  {
    id: 49, category: '象局', name: '兩個象殺局', difficulty: 2,
    fen: '7k/8/8/8/8/8/8/BBK5 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩象配合可強制逼殺，需把黑王推到角落',
  },
  {
    id: 50, category: '象局', name: '象對通路兵', difficulty: 2,
    fen: '8/8/8/8/p7/8/B7/K3k3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '象要先截斷兵的路線，再讓白王捉兵',
  },
  {
    id: 51, category: '象局', name: '壞象——封閉局', difficulty: 2,
    fen: '8/4k3/4p3/3pP3/3P4/4B3/4K3/8 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '白象是壞象（兵在同色格），黑方正確應對可和棋',
  },
  {
    id: 52, category: '象局', name: '象+多兵勝', difficulty: 2,
    fen: '8/3k4/3p1p2/3P1P2/4B3/4K3/8/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '象的優勢加上更好的王位，白方應能獲勝',
  },
  {
    id: 53, category: '象局', name: '象封鎖黑兵', difficulty: 2,
    fen: '8/8/8/3k4/3p4/3B4/3K4/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白象封鎖黑兵後，白王靠近捉兵',
  },
  {
    id: 54, category: '象局', name: '象錯色+邊兵——和棋', difficulty: 2,
    fen: 'k7/8/K7/P7/8/8/8/7B w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: 'a兵加上錯色象（升變格是暗色，象是亮色）——和棋',
  },
  {
    id: 55, category: '象局', name: '象+兩兵勝', difficulty: 2,
    fen: '8/8/8/8/3k4/3b4/3PP3/3KB3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩個兵的力量加上象，能突破黑方防線',
  },
  {
    id: 56, category: '象局', name: '象對兵（防守）', difficulty: 2,
    fen: '8/8/8/8/p7/k7/8/KB6 b - - 0 1',
    goal: '黑方獲勝', playerColor: 'b',
    hint: '黑方象+兵配合，能否推進升變？',
  },
  {
    id: 57, category: '象局', name: '異色象+兵——和棋技術', difficulty: 3,
    fen: '8/8/8/8/3b4/3k4/3P4/3KB3 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '異色象局，黑方阻擋兵升變即可和棋',
  },
  {
    id: 58, category: '象局', name: '象走三角', difficulty: 3,
    fen: '8/8/4k3/4p3/4P3/4B3/4K3/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '封閉局面，白方用象走三角製造 zugzwang',
  },
  {
    id: 59, category: '象局', name: '象擊潰黑兵群', difficulty: 3,
    fen: '8/3k4/3p4/4p3/3P1P2/4B3/4K3/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白象逐個瓦解黑方兵群',
  },
  {
    id: 60, category: '象局', name: '象對兩個通路兵', difficulty: 3,
    fen: '8/8/8/pp6/8/8/B7/K3k3 w - - 0 1',
    goal: '和棋', playerColor: 'w',
    hint: '兩個連通通路兵對象——白方要小心',
  },

  // ===== 馬局 (10) =====
  {
    id: 61, category: '馬局', name: '馬+兵——中央兵', difficulty: 2,
    fen: '8/8/8/8/8/3N4/3P4/3K3k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '馬控制升變格，讓兵安全前進',
  },
  {
    id: 62, category: '馬局', name: '馬無法逼殺', difficulty: 1,
    fen: '8/8/8/8/8/4k3/8/N3K3 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '馬+王無法強制逼殺，這是理論和棋',
  },
  {
    id: 63, category: '馬局', name: '馬對通路兵', difficulty: 2,
    fen: '8/8/8/8/p7/k7/8/KN6 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '馬能否阻止通路兵升變？精確計算跳法',
  },
  {
    id: 64, category: '馬局', name: '馬跳法——靠近', difficulty: 2,
    fen: '8/8/8/4k3/4N3/4K3/4P3/8 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '馬跳步護送兵升變',
  },
  {
    id: 65, category: '馬局', name: 'h兵+馬——難題', difficulty: 3,
    fen: '8/8/8/8/8/7k/7p/6KN b - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: 'h兵到達第二排，黑王在 h3——白馬能阻止嗎？',
  },
  {
    id: 66, category: '馬局', name: '馬對馬——和棋', difficulty: 2,
    fen: '8/8/8/3n4/3N4/8/8/3K3k w - - 0 1',
    goal: '和棋', playerColor: 'w',
    hint: '純粹馬對馬通常是和棋',
  },
  {
    id: 67, category: '馬局', name: '馬的位置價值', difficulty: 2,
    fen: '8/8/8/8/8/N7/P7/K6k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '馬在邊緣效率低，需先調整位置',
  },
  {
    id: 68, category: '馬局', name: '馬對象——封閉', difficulty: 3,
    fen: '8/8/3k4/3p4/3P4/3K4/8/3N4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '封閉局面馬比象靈活，尋找突破口',
  },
  {
    id: 69, category: '馬局', name: '兩馬對王', difficulty: 3,
    fen: '8/8/8/8/8/4k3/8/NN2K3 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '兩馬理論上無法強制逼殺，但要注意陷阱',
  },
  {
    id: 70, category: '馬局', name: '馬+兩兵勝', difficulty: 2,
    fen: '8/8/8/8/3k4/3n4/3PP3/3KN3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩個兵的數量優勢決定勝負',
  },

  // ===== 后局 (10) =====
  {
    id: 71, category: '后局', name: '后+王殺局——基礎', difficulty: 1,
    fen: '8/8/8/8/8/4k3/8/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后限制黑王，配合白王靠近後殺局',
  },
  {
    id: 72, category: '后局', name: '后對d2兵——白贏', difficulty: 2,
    fen: '8/8/8/8/8/8/3p4/3k1K2 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'd兵在第二排，白方后能贏——精確阻止升變',
  },
  {
    id: 73, category: '后局', name: '后對a2兵——和棋風險', difficulty: 3,
    fen: '8/8/8/8/8/8/p7/k3K2Q b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'a兵有逼和陷阱，白方要精確走步',
  },
  {
    id: 74, category: '后局', name: '后對c2兵——和棋風險', difficulty: 3,
    fen: '8/8/8/8/8/8/2p5/k2K2Q1 b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'c兵同樣有逼和危險，比 d 兵更棘手',
  },
  {
    id: 75, category: '后局', name: '后對f2兵——白贏', difficulty: 2,
    fen: '8/8/8/8/8/8/5p2/5k1K b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: 'f兵不像 a/c 兵那樣有逼和陷阱，白方應能贏',
  },
  {
    id: 76, category: '后局', name: '后對車——白贏', difficulty: 2,
    fen: '3k4/3r4/8/8/8/8/8/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后比車強，用 fork 或 skewer 贏得車',
  },
  {
    id: 77, category: '后局', name: '后對后——和棋', difficulty: 3,
    fen: '3k4/3q4/8/8/8/8/3Q4/3K4 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '后對后通常是和棋，黑方要保持永久將',
  },
  {
    id: 78, category: '后局', name: '后+兵——快速升變', difficulty: 1,
    fen: '8/8/8/8/8/8/3P4/3KQ2k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后+兵配合，或直接殺局或升變為雙后',
  },
  {
    id: 79, category: '后局', name: '后對象+馬', difficulty: 3,
    fen: '3k4/3bn3/8/8/8/8/8/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后通常強於象+馬，找機會吃掉其中一個',
  },
  {
    id: 80, category: '后局', name: '后+兵對后', difficulty: 3,
    fen: '3k4/3q4/8/8/3P4/8/8/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '多一個兵就有勝機，交換后後進入勝利的兵局',
  },

  // ===== 複合殘局 (20) =====
  {
    id: 81, category: '複合殘局', name: '象+馬殺局', difficulty: 3,
    fen: '8/8/8/8/8/4k3/8/BNK5 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '象+馬可以逼殺，需把黑王逼到特定角落——極難',
  },
  {
    id: 82, category: '複合殘局', name: '車對象', difficulty: 2,
    fen: '3k4/3b4/8/8/8/8/8/R3K3 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '車對象通常是和棋，黑方要保持防守',
  },
  {
    id: 83, category: '複合殘局', name: '車對馬', difficulty: 2,
    fen: '3k4/3n4/8/8/8/8/8/R3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車通常比馬強，利用 fork 或壓制贏得馬',
  },
  {
    id: 84, category: '複合殘局', name: '后對車', difficulty: 2,
    fen: '3k4/8/8/8/8/8/3r4/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后對車，找機會 fork 或 skewer',
  },
  {
    id: 85, category: '複合殘局', name: '車+象對車——和棋', difficulty: 3,
    fen: '3k4/3r4/8/8/3B4/8/8/R3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車+象對車是理論勝局，但技術複雜',
  },
  {
    id: 86, category: '複合殘局', name: '車+馬對車', difficulty: 3,
    fen: '3k4/3r4/8/8/3N4/8/8/R3K3 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '車+馬對車理論上是和棋，正確防守維持均勢',
  },
  {
    id: 87, category: '複合殘局', name: '后對車+兵', difficulty: 3,
    fen: '3k4/3rp3/8/8/8/8/8/Q3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后對車+兵，防守方有更多資源，白方需精確',
  },
  {
    id: 88, category: '複合殘局', name: '車+兵對象+兵——勝', difficulty: 3,
    fen: '8/8/3k4/3p4/3P4/3b4/3K4/3R4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車比象強，找機會突破',
  },
  {
    id: 89, category: '複合殘局', name: '兩象殺局——入門', difficulty: 2,
    fen: '7k/8/5K2/8/8/8/8/BB6 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '兩象配合把黑王驅到角落，比一個象容易多了',
  },
  {
    id: 90, category: '複合殘局', name: '后對雙車', difficulty: 3,
    fen: '3k4/3rr3/8/8/8/8/8/Q3K3 b - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '兩個車協防對抗后，黑方尋求和棋',
  },
  {
    id: 91, category: '複合殘局', name: '車+兵對馬+兵', difficulty: 3,
    fen: '8/8/3k4/3p4/3P4/3n4/3K4/3R4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車比馬強，利用這個優勢突破',
  },
  {
    id: 92, category: '複合殘局', name: '車對兩個通路兵', difficulty: 3,
    fen: '8/8/8/pp6/8/8/8/R3K2k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '車通常能對付兩個連通通路兵，但需精確',
  },
  {
    id: 93, category: '複合殘局', name: '象+兵對馬——正色', difficulty: 3,
    fen: '8/8/8/8/3k4/3n4/3PB3/3K4 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '象+兵對馬，兵在象的顏色格——能贏嗎？',
  },
  {
    id: 94, category: '複合殘局', name: '馬+兵對象+兵', difficulty: 3,
    fen: '8/8/3k4/3p4/3P4/3b4/3N4/3K4 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '馬+兵對象+兵，封閉局面通常是和棋',
  },
  {
    id: 95, category: '複合殘局', name: '后對三個通路兵', difficulty: 3,
    fen: '8/8/8/ppp5/8/8/8/Q3K2k w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '三個連通通路兵很危險，但后應能阻止',
  },
  {
    id: 96, category: '複合殘局', name: '王+兵活躍性', difficulty: 2,
    fen: '8/8/8/8/3k4/3p4/3P4/3K4 w - - 0 1',
    goal: '和棋', playerColor: 'b',
    hint: '雙兵對稱，王的位置決定勝負',
  },
  {
    id: 97, category: '複合殘局', name: '車+4兵對車+3兵', difficulty: 3,
    fen: '3k4/3r4/ppp5/PPP5/4P3/8/8/R3K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '多一個兵的優勢，找機會換子進入勝利的兵局',
  },
  {
    id: 98, category: '複合殘局', name: '后對象+兵', difficulty: 2,
    fen: '8/8/8/8/8/3k4/3b3p/3K3Q b - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '后對象+兵，利用多子優勢',
  },
  {
    id: 99, category: '複合殘局', name: '全力衝刺——兵升變競賽', difficulty: 2,
    fen: '8/8/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '白方有完整兵陣，如何最快升變？',
  },
  {
    id: 100, category: '複合殘局', name: '終局收官——車象馬對王', difficulty: 2,
    fen: '7k/8/8/8/8/8/8/RBN1K3 w - - 0 1',
    goal: '白方獲勝', playerColor: 'w',
    hint: '全子對孤王，展示最強子力的配合',
  },
]
