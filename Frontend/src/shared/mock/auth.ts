import type { LoginResult } from '../types/auth'

const mockAccounts: Array<{ email: string; password: string; profile: LoginResult['user'] }> = [
  {
    email: 'admin@research.local',
    password: '123456',
    profile: {
      id: 1,
      username: 'admin',
      email: 'admin@research.local',
      organization: '智能计算实验室',
      avatarUrl: '',
      signature: '科研文档协作测试账号',
      professionalTitle: 'researcher',
      supervisor: '张教授',
      displayName: '管理员',
      status: 'active',
      role: 'admin',
    },
  },
  {
    email: 'owner@research.local',
    password: '123456',
    profile: {
      id: 2,
      username: 'owner',
      email: 'owner@research.local',
      organization: '智能材料研究中心',
      avatarUrl: '',
      signature: '文档负责人视角',
      professionalTitle: 'researcher',
      supervisor: '王教授',
      displayName: '文档拥有者',
      status: 'active',
      role: 'owner',
    },
  },
  {
    email: 'member@research.local',
    password: '123456',
    profile: {
      id: 3,
      username: 'member',
      email: 'member@research.local',
      organization: '科研团队 A 组',
      avatarUrl: '',
      signature: '普通协作者视角',
      professionalTitle: 'master_student',
      supervisor: '李老师',
      displayName: '普通成员',
      status: 'active',
      role: 'member',
    },
  },
]

export async function mockLogin(email: string, password: string) {
  await wait(300)

  const matched = mockAccounts.find(
    (account) => account.email === email.trim() && account.password === password,
  )

  if (!matched) {
    throw new Error(
      'Mock 登录失败，可用账号：admin@research.local、owner@research.local、member@research.local，密码均为 123456',
    )
  }

  return {
    accessToken: `mock-token-${Date.now()}`,
    expiresIn: 7200,
    user: matched.profile,
  } satisfies LoginResult
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
