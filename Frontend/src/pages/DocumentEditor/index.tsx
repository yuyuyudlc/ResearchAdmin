import EditorWorkspace from './components/EditorWorkspace'
import { useDocumentEditor } from './hooks/useDocumentEditor'

function DocumentEditorPage() {
  const {
    loading,
    document,
    status,
    historyRows,
    shareList,
    shareTarget,
    sharePermission,
    setShareTarget,
    setSharePermission,
    saveDocument,
    changeStatus,
    addShare,
    removeShare,
    goBack,
  } = useDocumentEditor()

  return (
    <EditorWorkspace
      loading={loading}
      document={document}
      status={status}
      historyRows={historyRows}
      shareList={shareList}
      shareTarget={shareTarget}
      sharePermission={sharePermission}
      onShareTargetChange={setShareTarget}
      onSharePermissionChange={setSharePermission}
      onSave={saveDocument}
      onChangeStatus={changeStatus}
      onAddShare={addShare}
      onRemoveShare={removeShare}
      onBack={goBack}
    />
  )
}

export default DocumentEditorPage
