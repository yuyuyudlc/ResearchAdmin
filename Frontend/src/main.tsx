import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'

import { AuthProvider } from './contexts/AuthContext'
import { PrivateSpaceProvider } from './contexts/PrivateSpaceContext'
import App from './app'
import { antdTheme } from './theme/antdTheme'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <PrivateSpaceProvider>
              <App />
            </PrivateSpaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
