import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const Layout = lazy(() => import('../pages/Layout'))
const LoginPage = lazy(() => import('../pages/Login'))
const HomePage = lazy(() => import('../pages/Home'))
const WorkspaceListPage = lazy(() => import('../pages/WorkspaceList'))
const WorkspaceDetailPage = lazy(() => import('../pages/WorkspaceDetail'))
const DocumentEditorPage = lazy(() => import('../pages/DocumentEditor'))
const AdminUsersPage = lazy(() => import('../pages/AdminUsers'))

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'workspaces',
        element: <WorkspaceListPage />,
      },
      {
        path: 'workspaces/:workspaceId',
        element: <WorkspaceDetailPage />,
      },
      {
        path: 'documents/:documentId',
        element: <DocumentEditorPage />,
      },
      {
        path: 'admin/users',
        element: <AdminUsersPage />,
      },
    ],
  },
]