import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  loadSession, login as apiLogin, validateSession, fetchQuestions,
  logout as apiLogout, isConfigured,
} from './api'
import { enableProtection, disableProtection } from '../utils/protection'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [questionsError, setQuestionsError] = useState(null)

  const loadQuestions = useCallback(async () => {
    setQuestionsError(null)
    setQuestionsLoading(true)
    try {
      const qs = await fetchQuestions()
      setQuestions(qs)
      return qs
    } catch (e) {
      setQuestionsError(e.message || 'Không tải được câu hỏi')
      throw e
    } finally {
      setQuestionsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        if (!isConfigured()) {
          setError('config')
          setLoading(false)
          return
        }
        const session = loadSession()
        if (session) {
          const valid = await validateSession()
          if (valid && !cancelled) {
            enableProtection()
            try {
              await loadQuestions()
              setUser(valid.user)
            } catch {
              apiLogout()
              disableProtection()
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [loadQuestions])

  const login = async (email, password) => {
    setError(null)
    setQuestionsError(null)
    const data = await apiLogin(email, password)
    if (!data.ok) throw new Error(data.error)
    enableProtection()
    try {
      await loadQuestions()
      setUser(data.user)
    } catch (e) {
      apiLogout()
      disableProtection()
      throw e
    }
    return data
  }

  const logout = () => {
    apiLogout()
    disableProtection()
    setUser(null)
    setQuestions(null)
  }

  return (
    <AuthContext.Provider value={{
      user, questions, loading, questionsLoading, error, questionsError,
      login, logout, loadQuestions, isConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
