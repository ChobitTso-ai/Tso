import { useState } from 'react'
import './LoginGate.css'

// base64 混淆，避免明文出現在 bundle（僅前端閘門，非真正安全機制）
const VALID_USER = 'VFNP'      // 'TSO'
const VALID_PASS = 'Zm9ya2lk'  // 'forkid'
const AUTH_KEY = 'tsoAuth'

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === 'ok')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')

  if (authed) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let ok = false
    try {
      ok = btoa(user) === VALID_USER && btoa(pass) === VALID_PASS
    } catch {
      // btoa 遇非 ASCII 字元會丟例外，視為登入失敗
    }
    if (ok) {
      sessionStorage.setItem(AUTH_KEY, 'ok')
      setAuthed(true)
    } else {
      setError('帳號或密碼錯誤')
      setPass('')
    }
  }

  return (
    <div className="login-gate">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">🎮</div>
        <h1 className="login-title">TSO Games</h1>
        <p className="login-subtitle">請登入後開始遊戲</p>

        <input
          className="login-input"
          type="text"
          placeholder="帳號"
          value={user}
          onChange={e => { setUser(e.target.value); setError('') }}
          autoFocus
        />
        <input
          className="login-input"
          type="password"
          placeholder="密碼"
          value={pass}
          onChange={e => { setPass(e.target.value); setError('') }}
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" type="submit">登入</button>
      </form>
    </div>
  )
}
