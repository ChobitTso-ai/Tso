// ================= DATA：島、旅人路線、時段；遊戲本身在 island/data/games.json =================
// 島的 q,r 是六角座標；相鄰的島之間會自動搭橋。新增遊戲時只要把它放進 games.json 對應的島，不用改這裡。
const DATA = {
  city: { name: 'TSO', en: 'TSO', subtitle: '遊戲群島', subtitleEn: 'Game Isles' },
  islands: [
    { id: 'board', no: '01', name: '棋盤島', en: 'Board Isle', q: 0, r: 0, ground: 'brick', tree: 'cone', band: '#6f7fb5',
      summary: '棋類與策略對戰，想一想再出手。', summaryEn: 'Chess and strategy duels. Think before you move.' },
    { id: 'learn', no: '02', name: '學習島', en: 'Learning Isle', q: 1, r: 0, ground: 'speckle', tree: 'fruit', band: '#58a6a6',
      summary: '數學、知識問答與程式思維，邊玩邊學。', summaryEn: 'Math, quizzes and coding logic. Learn while you play.' },
    { id: 'puzzle', no: '03', name: '解謎島', en: 'Puzzle Isle', q: 0, r: 1, ground: 'stripe', tree: 'cherry', band: '#fcea8b',
      summary: '用手畫線、動腦筋，解開物理謎題。', summaryEn: 'Draw lines and solve physics puzzles.' },
    { id: 'kingdom', no: '04', name: '三國島', en: 'Kingdoms Isle', q: 1, r: 1, ground: 'brick', tree: 'willow', band: '#db6a41',
      summary: '三國主題小遊戲，陸續加入中。', summaryEn: 'Three Kingdoms mini games, coming one by one.' },
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
DATA.islands.forEach((d) => { d.items = sortIssues(ISSUES[d.id] || []); });
