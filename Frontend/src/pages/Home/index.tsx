import CreateDocumentModal from './components/CreateDocumentModal'
import DocumentWorkspace from './components/DocumentWorkspace'
import HeaderPanel from './components/HeaderPanel'
import MetricCards from './components/MetricCards'
import TodoPanel from './components/TodoPanel'
import UploadDocumentModal from './components/UploadDocumentModal'
import { useHome } from './hooks/useHome'
import type { UserRole } from '../../shared/types/auth'
import styles from './style/index.module.css'

function HomePage() {
  const {
    user,
    loading,
    documents,
    dataSource,
    stats,
    todos,
    keyword,
    stage,
    stageOptions,
    mockRole,
    mockScenarios,
    createOpen,
    uploadOpen,
    setKeyword,
    setStage,
    setCreateOpen,
    setUploadOpen,
    handleLogout,
    loadDocuments,
    showSyncHint,
    setMockRole,
    openEditor,
    handleCreateDocument,
    handleUploadDocument,
  } = useHome()

  if (!user) {
    return null
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <HeaderPanel
          user={user}
          keyword={keyword}
          stage={stage}
          stageOptions={stageOptions}
          mockMode={dataSource === 'mock'}
          mockRole={mockRole}
          mockScenarios={mockScenarios}
          loading={loading}
          onKeywordChange={setKeyword}
          onStageChange={(value) => setStage(value as (typeof stageOptions)[number])}
          onMockRoleChange={(value) => setMockRole(value as UserRole)}
          onCreate={() => setCreateOpen(true)}
          onUpload={() => setUploadOpen(true)}
          onRefresh={() => {
            void loadDocuments()
            showSyncHint()
          }}
          onLogout={handleLogout}
        />

        <MetricCards stats={stats} />

        <div className={styles.grid}>
          <DocumentWorkspace
            loading={loading}
            documents={documents}
            dataSource={dataSource}
            onOpenEditor={openEditor}
          />
          <TodoPanel todos={todos} />
        </div>
      </section>

      <CreateDocumentModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreateDocument}
      />
      <UploadDocumentModal
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onSubmit={handleUploadDocument}
      />
    </main>
  )
}

export default HomePage
