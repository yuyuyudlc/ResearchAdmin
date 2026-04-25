import LoginFormCard from './components/LoginFormCard'
import { useLogin } from './hooks/useLogin'
import styles from './style/index.module.css'

function LoginPage() {
  const { handleLogin, handleLoginError } = useLogin()

  return (
    <main className={styles.page}>
      <div className={styles.grid} />
      <section className={styles.content}>
        <aside className={styles.intro}>
          <h1 className={styles.name}>Research Admin</h1>
          <p className={styles.desc}>
            面向科研场景的文档工作台，覆盖文档归档、权限控制、协同编辑与审计追踪。
          </p>
          <ul className={styles.list}>
            <li>支持文档全生命周期管理与检索</li>
            <li>支持角色、用户组与文档级授权</li>
            <li>支持协作留痕和历史快照追溯</li>
          </ul>
        </aside>

        <LoginFormCard
          onSubmit={async (values) => {
            try {
              await handleLogin(values)
            } catch (error) {
              handleLoginError(error)
            }
          }}
        />
      </section>
    </main>
  )
}

export default LoginPage
