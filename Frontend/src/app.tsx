import { useRoutes } from 'react-router-dom'

import { routesConfig } from './router/config'

function App() {
  return useRoutes(routesConfig)
}

export default App
