import { Alert, Button, Card, Form, Input, Typography } from 'antd'

import { useLogin, type LoginFormValues } from './hooks/useLogin'
import styles from './style/index.module.css'

const { Text, Title } = Typography

export default function LoginPage() {
  const { error, loading, handleSubmit } = useLogin()

  return (
    <div className={styles.page}>
      <Card className={styles.card} variant="borderless">
        <div className={styles.header}>
          <div className={styles.logo}>R</div>
          <Title level={3} className={styles.title}>
            科研项目文档管理系统
          </Title>
          <Text type="secondary">高效协作，知识沉淀</Text>
        </div>

        <Form<LoginFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
          autoComplete="on"
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>

          {error && (
            <Alert className={styles.error} type="error" message={error} showIcon />
          )}

          <Button block type="primary" htmlType="submit" loading={loading}>
            登录
          </Button>
        </Form>

        <Text className={styles.hint} type="secondary">
          管理员 admin@research.com / admin123，普通用户 user@research.com / user123
        </Text>
      </Card>
    </div>
  )
}
