import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

export interface LoginFormValues {
  email: string
  password: string
}

export function useLogin() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/workspaces')
    }
  }, [user, navigate])

  const handleSubmit = async (values: LoginFormValues) => {
    setError('')
    setLoading(true)

    try {
      await login(values.email, values.password)
      navigate('/workspaces')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return {
    error,
    loading,
    handleSubmit,
  }
}
