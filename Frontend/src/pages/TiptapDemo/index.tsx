import TiptapEditor from './components/TiptapEditor'
import { useTiptapDemo } from './hooks/useTiptapDemo'
import styles from './style/index.module.css'

function TiptapDemoPage() {
  const { title, description } = useTiptapDemo()

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <TiptapEditor />
      </section>
    </main>
  )
}

export default TiptapDemoPage
