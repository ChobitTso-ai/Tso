import { generatePuzzle } from './logic'
import type { Level, Size } from './logic'

// 10×10 困難題要算零點幾秒，放在 Worker 才不會卡住畫面
self.onmessage = (e: MessageEvent<{ size: Size; level: Level }>) => {
  self.postMessage(generatePuzzle(e.data.size, e.data.level))
}
