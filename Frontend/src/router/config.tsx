import type { RouteObject } from 'react-router-dom'

import TiptapDemoPage from '../pages/TiptapDemo'

export const routesConfig: RouteObject[] = [
  {
    path: '/',
    element: <TiptapDemoPage />,
  },
]
