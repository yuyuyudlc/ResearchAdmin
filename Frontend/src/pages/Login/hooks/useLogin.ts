import { message } from 'antd'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { requestJSON } from '../../../shared/api'
import { setAuthSession } from '../../../shared/authStorage'
import { useMock } from '../../../shared/config'
import { mockLogin } from '../../../shared/mock/auth'
import type { LoginResult } from '../../../shared/types/auth'

export interface LoginFormValues {
  email: string
  password: string
}

export function useLogin() {
  const navigate = useNavigate()

  const handleLogin = useCallback(
    async (values: LoginFormValues) => {
      const loginResult = useMock
        ? await mockLogin(values.email, values.password)
        : (
            await requestJSON<LoginResult>('/api/v1/auth/login', {
              method: 'POST',
              body: JSON.stringify({
                email: values.email.trim(),
                password: values.password,
              }),
            })
          ).data

      const normalizedUser = {
        ...loginResult.user,
        role:
          loginResult.user.role === 'admin' ||
          loginResult.user.role === 'owner' ||
          loginResult.user.role === 'member'
            ? loginResult.user.role
            : 'member',
      }

      setAuthSession(loginResult.accessToken, normalizedUser)
      message.success('登录成功')
      navigate('/', { replace: true })
    },
    [navigate],
  )

  const handleLoginError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      message.error(error.message)
      return
    }

    message.error('登录失败，请稍后重试')
  }, [])

  return {
    handleLogin,
    handleLoginError,
  }
}
