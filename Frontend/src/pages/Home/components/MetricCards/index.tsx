import { Col, Row, Statistic } from 'antd'

import type { DashboardStats } from '../../../../shared/types/document'
import { useMetricCards } from './hooks/useMetricCards'
import styles from './style/index.module.css'

interface MetricCardsProps {
  stats: DashboardStats
}

function MetricCards({ stats }: MetricCardsProps) {
  const cards = useMetricCards(stats)

  return (
    <section className={styles.section}>
      <Row gutter={[14, 14]}>
        {cards.map((item) => (
          <Col key={item.key} xs={24} sm={12} lg={6}>
            <article className={styles.card}>
              <Statistic title={item.label} value={item.value} />
              <p className={styles.note}>{item.note}</p>
            </article>
          </Col>
        ))}
      </Row>
    </section>
  )
}

export default MetricCards
