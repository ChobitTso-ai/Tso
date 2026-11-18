// 產生「方陣找找看」的英文單字表：src/components/wordgrid/words.ts
//
// 來源：SCOWL（Kevin Atkinson 整理），經 npm 套件 wordlist-english@1.2.1 取得。
// 授權允許任何用途，條件是附上著作權聲明，全文見 public/licenses/SCOWL-Copyright.txt。
//
// 用法（單字表不常改，所以不列為專案依賴，要重產時才下載）：
//   npm pack wordlist-english@1.2.1 && tar xzf wordlist-english-1.2.1.tgz
//   node scripts/make-wordlist.mjs ./package
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('用法：node scripts/make-wordlist.mjs <wordlist-english 解開後的 package 目錄>')
  process.exit(1)
}

const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'))
const level = (n) => [...read(`english-words-${n}.json`), ...read(`american-words-${n}.json`)]

// 給十歲孩子玩，排除髒話、歧視字眼與性相關字詞（逐字比對，不影響 grape、class 這類字）
const BLOCKED = new Set(`
  pussy bitch bitched bitches bitching bastard bastards whore whores slut sluts
  damn damnation damned damning damns damnedest hell hellish crap
  faggot faggots fagot fagots chink chinks retard retarded retarding retards
  rape raped rapes sex sexes sexist sexual sexuality sexually sexy sexed sexing sexism
  pornography pornographic tit tits titillate titillated titillates titillating booby
  ass asses penis penises vagina vaginae vaginal anal anus anuses orgasm erection erections
  nude nuder nudes nudest horny semen sperm sperms nipple nipples genital genitals
  testicle testicles clitoris incest incestuous molest molested molesting molests
  condom condoms virginity cocaine heroin heroins booze bugger buggers bloody
  drunk drunken drunkard drunkards drunkenly drunkenness drunker drunkest drunks
`.trim().split(/\s+/))

const clean = (words) => [...new Set(words)]
  .filter(w => /^[a-z]{3,}$/.test(w) && !BLOCKED.has(w))
  .sort()

// 10、20 級是最常用的字，用來算「盤面總分」；35 級只當額外加分，不計入過關門檻
const common = clean([...level(10), ...level(20)])
const commonSet = new Set(common)
const extra = clean(level(35)).filter(w => !commonSet.has(w))

const out = `// 由 scripts/make-wordlist.mjs 產生，請勿手動修改
// 英文單字取自 SCOWL：Copyright 2000-2016 by Kevin Atkinson，著作權聲明全文見 public/licenses/SCOWL-Copyright.txt
// 常用字 ${common.length} 個、額外字 ${extra.length} 個，以空白分隔

export const COMMON_WORDS = '${common.join(' ')}';

export const EXTRA_WORDS = '${extra.join(' ')}';
`
writeFileSync(new URL('../src/components/wordgrid/words.ts', import.meta.url), out)
console.log(`常用字 ${common.length}、額外字 ${extra.length}`)
