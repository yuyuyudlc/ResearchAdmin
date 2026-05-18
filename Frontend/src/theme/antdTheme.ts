import type { ThemeConfig } from 'antd'

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#171717',
    colorLink: '#0070f3',
    colorSuccess: '#0070f3',
    colorWarning: '#f5a623',
    colorError: '#ee0000',
    colorText: '#171717',
    colorTextSecondary: '#4d4d4d',
    colorTextTertiary: '#888888',
    colorBorder: '#ebebeb',
    colorBgLayout: '#fafafa',
    colorBgContainer: '#ffffff',
    borderRadius: 6,
    borderRadiusLG: 8,
    fontFamily: 'Geist, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
    controlHeight: 40,
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 8,
    },
    Modal: {
      borderRadiusLG: 8,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#4d4d4d',
      rowHoverBg: '#f5f5f5',
    },
  },
}
