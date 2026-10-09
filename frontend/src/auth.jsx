import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => api.setToken(null))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password)
    api.setToken(res.access_token)
    const me = await api.getMe()
    setUser(me)
  }, [])

  const register = useCallback(async (username, password) => {
    const res = await api.register(username, password)
    api.setToken(res.access_token)
    const me = await api.getMe()
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
