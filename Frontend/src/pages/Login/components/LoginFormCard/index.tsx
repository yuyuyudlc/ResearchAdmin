import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Button, Form, Input, Typography } from 'antd'

import type { LoginFormValues } from '../../hooks/useLogin'
import { useLoginFormCard } from './hooks/useLoginFormCard'
import styles from './style/index.module.css'

interface LoginFormCardProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
}

function LoginFormCard({ onSubmit }: LoginFormCardProps) {
  const { title, subtitle, hint } = useLoginFormCard()

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <Typography.Title level={2} className={styles.title}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className={styles.subtitle}>{subtitle}</Typography.Paragraph>
      </header>

      <Form<LoginFormValues> layout="vertical" requiredMark={false} onFinish={onSubmit}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效邮箱地址' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="name@example.com" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码长度至少 6 位' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
        </Form.Item>

        <Form.Item className={styles.submit}>
          <Button htmlType="submit" type="primary" size="large" block>
            登录
          </Button>
        </Form.Item>
      </Form>

      <Typography.Text className={styles.hint}>{hint}</Typography.Text>
    </section>
  )
}

export default LoginFormCard
