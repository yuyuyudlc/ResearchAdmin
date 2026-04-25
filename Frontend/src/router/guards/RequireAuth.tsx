import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getAccessToken } from '../../shared/authStorage'

interface RequireAuthProps {
  children: ReactElement
}

function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const token = getAccessToken()

  if (!token) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  return children
}

export default RequireAuth
