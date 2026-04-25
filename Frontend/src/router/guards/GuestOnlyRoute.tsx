import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'

import { getAccessToken } from '../../shared/authStorage'

interface GuestOnlyRouteProps {
  children: ReactElement
}

function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const token = getAccessToken()

  if (token) {
    return <Navigate replace to="/" />
  }

  return children
}

export default GuestOnlyRoute
