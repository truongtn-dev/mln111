import { useState, useEffect, useCallback } from 'react'
import {
  Shield, LogOut, UserPlus, Users, Copy, Check, Lock, Mail, User, ChevronLeft, RefreshCw,
} from 'lucide-react'
import {
  adminLogin, adminLogout, validateAdminSession, loadAdminSession,
  adminCreateUser, adminListUsers, adminSetActive,
} from '../auth/api'
import Footer from './Footer'

export default function AdminPanel({ onBack }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [users, setUsers] = useState([])
  const [copied, setCopied] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' })
  const [lastCreated, setLastCreated] = useState(null)
  const [creating, setCreating] = useState(false)

  const token = admin?.token

  const refreshUsers = useCallback(async () => {
    if (!token) return
    const data = await adminListUsers(token)
    if (data.ok) setUsers(data.users)
  }, [token])

  useEffect(() => {
    validateAdminSession().then((s) => {
      if (s) setAdmin(s)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (token) refreshUsers()
  }, [token, refreshUsers])

  const handleLogin = async (e) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const data = await adminLogin(loginForm.email, loginForm.password)
      if (!data.ok) throw new Error(data.error)
      setAdmin(loadAdminSession())
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setErr(null)
    setCreating(true)
    try {
      const data = await adminCreateUser(token, createForm.name, createForm.email, createForm.password)
      if (!data.ok) throw new Error(data.error)
      setLastCreated(data.credentials)
      setCreateForm({ name: '', email: '', password: '' })
      await refreshUsers()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (email, active) => {
    await adminSetActive(token, email, !active)
    await refreshUsers()
  }

  const copyCred = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const logout = () => {
    adminLogout()
    setAdmin(null)
    setUsers([])
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="auth-page">
        <div className="auth-bg-orbs" aria-hidden />
        <div className="auth-card">
          <button type="button" className="btn btn-ghost admin-back" onClick={onBack}>
            <ChevronLeft size={18} /> Về đăng nhập học viên
          </button>
          <div className="auth-brand">
            <Shield size={40} color="#ffd166" />
            <div>
              <h1>Quản trị MLN111</h1>
              <p>Cấp tài khoản cho học viên</p>
            </div>
          </div>
          {err && <div className="auth-banner err">{err}</div>}
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-field">
              <Mail size={18} />
              <input type="email" placeholder="Email admin" value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} required />
            </label>
            <label className="auth-field">
              <Lock size={18} />
              <input type="password" placeholder="Mật khẩu admin" value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} required />
            </label>
            <button type="submit" className="btn btn-primary auth-submit">Đăng nhập Admin</button>
          </form>
        </div>
      </div>
    )
  }

  const appLink = `${window.location.origin}/`

  return (
    <div className="app-shell admin-shell">
      <header className="screen-header">
        <div>
          <h2 className="screen-title"><Shield size={20} /> Quản trị</h2>
          <p className="admin-sub">{admin.user?.email}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost" onClick={refreshUsers}><RefreshCw size={16} /></button>
          <button type="button" className="btn btn-ghost" onClick={logout}><LogOut size={16} /> Thoát</button>
        </div>
      </header>

      {err && <div className="auth-banner err">{err}</div>}

      <div className="admin-grid">
        <section className="card admin-section">
          <h3><UserPlus size={18} /> Tạo tài khoản học viên</h3>
          <p className="admin-hint">Gửi link app + email + mật khẩu cho khách sau khi bán.</p>
          <form className="auth-form" onSubmit={handleCreate}>
            <label className="auth-field">
              <User size={18} />
              <input placeholder="Họ tên" value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label className="auth-field">
              <Mail size={18} />
              <input type="email" placeholder="Email học viên" value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
            </label>
            <label className="auth-field">
              <Lock size={18} />
              <input type="text" placeholder="Mật khẩu (≥6 ký tự)" value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
            </label>
            <button type="submit" className="btn btn-primary auth-submit" disabled={creating}>
              {creating ? 'Đang tạo...' : 'Tạo & cấp quyền'}
            </button>
          </form>

          {lastCreated && (
            <div className="admin-created-box">
              <p><strong>Gửi cho học viên:</strong></p>
              <div className="admin-cred-row">
                <code>{lastCreated.email}</code>
                <button type="button" className="btn-icon" onClick={() => copyCred(lastCreated.email, 'e')}>
                  {copied === 'e' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="admin-cred-row">
                <code>{lastCreated.password}</code>
                <button type="button" className="btn-icon" onClick={() => copyCred(lastCreated.password, 'p')}>
                  {copied === 'p' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 10, width: '100%' }}
                onClick={() => copyCred(
                  `MLN111 Ôn Thi\nLink: ${appLink}\nEmail: ${lastCreated.email}\nMật khẩu: ${lastCreated.password}`,
                  'all'
                )}
              >
                {copied === 'all' ? 'Đã copy!' : 'Copy tin nhắn gửi khách'}
              </button>
            </div>
          )}
        </section>

        <section className="card admin-section">
          <h3><Users size={18} /> Học viên ({users.length})</h3>
          <div className="admin-user-list">
            {users.length === 0 && <p className="admin-hint">Chưa có học viên.</p>}
            {users.map((u) => (
              <div key={u.id} className={`admin-user-row ${u.active ? '' : 'locked'}`}>
                <div>
                  <strong>{u.name}</strong>
                  <span>{u.email}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleActive(u.email, u.active)}
                >
                  {u.active ? 'Khóa' : 'Mở khóa'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
