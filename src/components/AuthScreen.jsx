import { useState } from 'react'
import { LogIn, Mail, Lock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Footer from './Footer'

export default function AuthScreen() {
  const { login, error: configError, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleLogin = async (e) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(form.email, form.password)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  if (configError === 'config' && !isConfigured()) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--narrow">
          <AlertCircle size={40} color="#ffd166" />
          <h2>Chưa cấu hình server</h2>
          <p className="auth-sub">Thiết lập <code>VITE_APPS_SCRIPT_URL</code> trong file <code>.env</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs" aria-hidden />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-icon auth-logo">MLN</div>
          <div>
            <h1>MLN111 Ôn Thi</h1>
            <p>Triết học Mác — Lênin</p>
          </div>
        </div>

        <div className="auth-shield">
          <Shield size={16} />
          <span>Hệ thống riêng tư — chỉ học viên được cấp tài khoản mới vào được</span>
        </div>

        {err && <div className="auth-banner err">{err}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-field">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email được cấp"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <Lock size={18} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((s) => !s)} tabIndex={-1}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  )
}
