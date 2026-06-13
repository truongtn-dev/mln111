const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'

const SESSION_KEY = 'mln111_session'
const ADMIN_SESSION_KEY = 'mln111_admin_session'

export function isDevBypass() {
  return DEV_BYPASS && import.meta.env.DEV
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
      clearSession()
      return null
    }
    return s
  } catch {
    return null
  }
}

export function loadAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
      clearAdminSession()
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function saveAdminSession(session) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

async function callApi(payload) {
  if (!API_URL && !isDevBypass()) {
    throw new Error('Chưa cấu hình VITE_APPS_SCRIPT_URL')
  }

  if (isDevBypass() && payload.action === 'getQuestions') {
    const r = await fetch('/dev-questions.json')
    if (!r.ok) throw new Error('Dev: chạy npm run parse trước')
    return { ok: true, questions: await r.json() }
  }

  if (isDevBypass()) {
    if (payload.action === 'login') {
      return {
        ok: true,
        token: 'dev-token',
        user: { id: 'dev', name: 'Học viên', email: payload.email, role: 'user' },
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      }
    }
    if (payload.action === 'adminLogin') {
      return {
        ok: true,
        token: 'dev-admin',
        user: { id: 'admin', name: 'Admin', email: payload.email, role: 'admin' },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }
    }
    if (payload.action === 'adminCreateUser') {
      return { ok: true, message: 'Dev: đã tạo', credentials: { email: payload.email, password: payload.password } }
    }
    if (payload.action === 'adminListUsers') return { ok: true, users: [], total: 0 }
    if (payload.action === 'validate') return { ok: true, user: loadSession()?.user }
    if (payload.action === 'adminValidate') return { ok: true, user: loadAdminSession()?.user }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Server không phản hồi (quá 90 giây). Kiểm tra Apps Script và QUESTIONS_FILE_ID.')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Phản hồi server không hợp lệ')
  }
}

export async function login(email, password) {
  const data = await callApi({ action: 'login', email, password })
  if (data.ok) {
    saveSession({ token: data.token, user: data.user, expiresAt: data.expiresAt })
  }
  return data
}

export async function adminLogin(email, password) {
  const data = await callApi({ action: 'adminLogin', email, password })
  if (data.ok) {
    saveAdminSession({ token: data.token, user: data.user, expiresAt: data.expiresAt })
  }
  return data
}

export async function adminCreateUser(adminToken, name, email, password) {
  return callApi({ action: 'adminCreateUser', adminToken, name, email, password })
}

export async function adminListUsers(adminToken) {
  return callApi({ action: 'adminListUsers', adminToken })
}

export async function adminSetActive(adminToken, email, active) {
  return callApi({ action: 'adminSetActive', adminToken, email, active })
}

export async function validateSession() {
  const session = loadSession()
  if (!session?.token) return null
  if (isDevBypass()) return session
  const data = await callApi({ action: 'validate', token: session.token })
  if (!data.ok) { clearSession(); return null }
  return session
}

export async function validateAdminSession() {
  const session = loadAdminSession()
  if (!session?.token) return null
  if (isDevBypass()) return session
  const data = await callApi({ action: 'adminValidate', token: session.token })
  if (!data.ok) { clearAdminSession(); return null }
  return session
}

export async function fetchQuestions() {
  const session = loadSession()
  if (!session?.token && !isDevBypass()) throw new Error('Unauthorized')
  const data = await callApi({ action: 'getQuestions', token: session?.token || 'dev' })
  if (!data.ok) throw new Error(data.error || 'Không tải được câu hỏi')
  return data.questions
}

export function logout() {
  clearSession()
}

export function adminLogout() {
  clearAdminSession()
}

export function isConfigured() {
  return Boolean(API_URL) || isDevBypass()
}
