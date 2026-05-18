import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { Spin } from 'antd'

import { routesConfig } from './router/config'

function App() {
  return (
    <Suspense fallback={<Spin fullscreen />}>
      {useRoutes(routesConfig)}
    </Suspense>
  )
}

export default App
