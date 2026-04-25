import type { RouteObject } from 'react-router-dom'
import DocumentEditorPage from '../pages/DocumentEditor'
import HomePage from '../pages/Home'
import LoginPage from '../pages/Login'

import GuestOnlyRoute from './guards/GuestOnlyRoute'
import RequireAuth from './guards/RequireAuth'

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    path: '/documents/:documentId/edit',
    element: (
      <RequireAuth>
        <DocumentEditorPage />
      </RequireAuth>
    ),
  },
]
