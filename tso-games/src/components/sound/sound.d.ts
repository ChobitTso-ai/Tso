// sound.js 的型別（該檔同時給遊戲島使用，所以寫成純 JavaScript）
export function soundOn(): boolean
export function setSoundOn(on: boolean): void
export function initSound(opts: { music?: boolean; waves?: boolean }): () => void
export function blip(): void
export function chime(): void
export function speak(text: string): void
