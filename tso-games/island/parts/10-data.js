// ================= DATA：島、旅人路線、時段；遊戲本身在 island/data/games.json =================
// 島的 q,r 是六角座標；相鄰的島之間會自動搭橋。新增遊戲時只要把它放進 games.json 對應的島，不用改這裡。
const DATA = {
  city: { name: 'TSO', en: 'TSO', subtitle: '遊戲群島', subtitleEn: 'Game Isles' },
  islands: [
    { id: 'board', no: '01', name: '棋盤島', en: 'Board Isle', q: 0, r: 0, scale: 1.4, ground: 'checker', tree: 'cone', band: '#6f7fb5',
      summary: '棋類與策略對戰，想一想再出手。', summaryEn: 'Chess and strategy duels. Think before you move.',
      // 棋館加港口：西洋棋石台在中央當主位，殘局角在東，西南邊緣是港口水灣，戰艦停在水面上
      first: 'chess',
      layout: {
        chess: { x: -.15, z: -.4, size: 1.15 },
        endgames: { x: 1.2, z: .35, size: .75, yaw: -.3 },
        battleship: { x: -1.0, z: 1.75, size: .85, yaw: -.52 },
      },
      bay: { x: -1.0, z: 1.72, rx: 1.05, rz: .62, rot: .52 },
      roads: true },
    { id: 'learn', no: '02', name: '學習島', en: 'Learning Isle', q: 1, r: 0, ground: 'speckle', tree: 'fruit', band: '#58a6a6',
      summary: '數學、知識問答與程式思維，邊玩邊學。', summaryEn: 'Math, quizzes and coding logic. Learn while you play.' },
    { id: 'puzzle', no: '03', name: '解謎島', en: 'Puzzle Isle', q: 0, r: 1, ground: 'stripe', tree: 'cherry', band: '#fcea8b',
      summary: '畫線、找字、推理，動動腦解開各種謎題。', summaryEn: 'Draw, find words and deduce. Puzzles of every kind.' },
    { id: 'kingdom', no: '04', name: '三國島', en: 'Kingdoms Isle', q: 1, r: 1, scale: 1.5, ground: 'brick', tree: 'willow', band: '#db6a41',
      summary: '三國主題小遊戲，陸續加入中。', summaryEn: 'Three Kingdoms mini games, coming one by one.',
      // 照方位排成一張中國地圖：-z 是北。hub 在中央當主位，官渡在北、長坂坡在東、軍帳在西，長江橫過島，赤壁在南岸
      first: 'threekingdoms',
      layout: {
        threekingdoms: { x: 0, z: -.25, size: 1.15 },
        guandu: { x: -.9, z: -1.35, size: .8, yaw: .2 },
        strategist: { x: -1.45, z: 0, size: .8, yaw: .35 },
        changban: { x: 1.45, z: -.1, size: .85, yaw: -.35 },
        chibi: { x: .2, z: 1.68, size: .85 },
      },
      river: { z: .95, w: .46, amp: .1 },
      roads: true },
  ],
  // 旅人路線：小人在島與島之間走動（evidence 只影響路線線條樣式，這裡一律用實線）
  flows: [
    { id: 'f1', from: 'board', to: 'learn', cargo: 'book', role: 'student', evidence: 'official', label: '棋手去上數學課', en: 'Chess players heading to math class', count: 6 },
    { id: 'f2', from: 'learn', to: 'puzzle', cargo: 'laptop', role: 'researcher', evidence: 'official', label: '把算式帶去解謎', en: 'Taking formulas to the puzzles', count: 5 },
    { id: 'f3', from: 'puzzle', to: 'kingdom', cargo: 'ball', role: 'worker', evidence: 'official', label: '解謎高手去出征', en: 'Puzzle solvers off to battle', count: 5 },
    { id: 'f4', from: 'kingdom', to: 'board', cargo: 'letter', role: 'civil', evidence: 'official', label: '軍師來下一盤棋', en: 'Strategists come for a game of chess', count: 6 },
  ],
  // 一天時段：start 為分鐘；lit 是該時段亮起的模型種類
  dayCycle: [
    { start: 0, name: '深夜', en: 'Late night', lit: ['castle', 'ship'] },
    { start: 360, name: '清晨', en: 'Dawn', lit: ['blocks', 'robot'] },
    { start: 450, name: '上學時間', en: 'School time', lit: ['blackboard', 'robot', 'endgame', 'school'] },
    { start: 720, name: '午休', en: 'Lunch', lit: ['blocks', 'ramp'] },
    { start: 960, name: '放學後', en: 'After school', lit: ['ramp', 'chessboard', 'ship'] },
    { start: 1065, name: '黃昏', en: 'Dusk', lit: ['castle', 'chessboard'] },
    { start: 1140, name: '晚上', en: 'Evening', lit: ['ship', 'endgame', 'castle'] },
  ],
};

// 每座島的遊戲依熱度排，同熱度新的在前；排第一的佔主位
const sortIssues = (list) => [...list].sort((a, b) => b.heat - a.heat || b.updated.localeCompare(a.updated));
// first：指定主位的遊戲（例如 hub），不照熱度與日期排
DATA.islands.forEach((d) => {
  d.items = sortIssues(ISSUES[d.id] || []);
  if (d.first) d.items.sort((a, b) => (b.id === d.first) - (a.id === d.first));
});
