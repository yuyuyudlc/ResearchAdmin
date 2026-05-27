import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import StarterKit from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useAuth } from "../../../contexts/AuthContext";
import {
  canEdit as hasEditPermission,
  type DocumentNode,
} from "../../../services/types";
import { documentService } from "../../../services/document";
import { inferBodyType } from "../file-viewers";
import { CommentThreadMark } from "./commentMark";
import {
  addReplyToThread,
  collectThreadAnchors,
  createCommentThread,
  createUserColor,
  focusThreadAnchor,
  getPendingCommentSelection,
  readCollaborators,
  readCommentThreads,
  relocateThreadAnchor,
  type Collaborator,
  type CommentThread,
  type CurrentUserIdentity,
  type PendingCommentSelection,
  updateThreadStatus,
} from "./commentThreads";

export interface DocumentMetaValues {
  title: string;
  summary?: string;
}

function getCollaborationServerUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:3001/documents";
  }

  const runtimeValue = import.meta.env.VITE_COLLAB_URL;
  if (runtimeValue) {
    return runtimeValue;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3001/documents`;
}

function toCurrentUserIdentity(
  user: ReturnType<typeof useAuth>["user"],
): CurrentUserIdentity | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.displayName || user.username || user.email,
    avatarUrl: user.avatarUrl,
  };
}

export function useDocumentEditor() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = useMemo(() => toCurrentUserIdentity(user), [user]);
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);
  const autoSaveTimerRef = useRef<number | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const fetchInFlightRef = useRef(false);
  const lastFetchedIdRef = useRef<string | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [providerStatus, setProviderStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [document, setDocument] = useState<DocumentNode | null>(null);
  const [bodyData, setBodyData] = useState<ArrayBuffer | null>(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [pendingSelection, setPendingSelection] =
    useState<PendingCommentSelection | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const extensions = useMemo(() => {
    const list = [
      StarterKit.configure({
        undoRedo: false,
      }),
      CommentThreadMark,
      Collaboration.configure({
        document: ydoc,
      }),
    ];

    if (provider && currentUser) {
      list.push(
        CollaborationCaret.configure({
          provider,
          user: {
            name: currentUser.name,
            color: createUserColor(currentUser.id),
          },
        }),
      );
    }

    return list;
  }, [currentUser, provider, ydoc]);

  const editor = useEditor(
    {
      extensions,
      editorProps: {
        attributes: {
          class: "tiptap-editor-content",
        },
        handleClick: (_view, _position, event) => {
          const target = event.target as HTMLElement | null;
          const threadElement =
            target?.closest<HTMLElement>("[data-thread-id]");
          if (!threadElement?.dataset.threadId) {
            return false;
          }

          setActiveThreadId(threadElement.dataset.threadId);
          return true;
        },
      },
      immediatelyRender: false,
    },
    [extensions],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const canEditDocument =
    !!document &&
    hasEditPermission(document.permissionBit) &&
    document.status !== "archived";
  const isRichTextDocument = document?.docType === "rich_text";

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEditDocument);
  }, [editor, canEditDocument]);

  useEffect(() => {
    if (!documentId || !isRichTextDocument) {
      setProvider(null);
      setProviderStatus("disconnected");
      return;
    }

    const nextProvider = new WebsocketProvider(
      getCollaborationServerUrl(),
      documentId,
      ydoc,
      {
        connect: false,
        maxBackoffTime: 10000,
      },
    );

    setProvider(nextProvider);
    setProviderStatus("connecting");

    const connectTimer = window.setTimeout(() => {
      nextProvider.connect();
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      nextProvider.destroy();
      setProvider(null);
      setProviderStatus("disconnected");
    };
  }, [documentId, isRichTextDocument, ydoc]);

  useEffect(() => {
    if (!provider || !currentUser) {
      setCollaborators([]);
      return;
    }

    provider.awareness.setLocalStateField("user", {
      id: currentUser.id,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      color: createUserColor(currentUser.id),
    });

    const syncCollaborators = () => {
      startTransition(() => {
        setCollaborators(readCollaborators(provider.awareness, currentUser.id));
      });
    };

    const handleStatus = (event: {
      status: "connecting" | "connected" | "disconnected";
    }) => {
      startTransition(() => {
        setProviderStatus(event.status);
      });
    };

    syncCollaborators();
    provider.on("status", handleStatus);
    provider.awareness.on("change", syncCollaborators);

    return () => {
      provider.off("status", handleStatus);
      provider.awareness.off("change", syncCollaborators);
      provider.awareness.setLocalStateField("user", null);
    };
  }, [provider, currentUser]);

  const syncThreads = useCallback(() => {
    startTransition(() => {
      setThreads(readCommentThreads(ydoc, editor));
    });
  }, [editor, ydoc]);

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      return;
    }

    if (fetchInFlightRef.current && lastFetchedIdRef.current === documentId) {
      return;
    }
    fetchInFlightRef.current = true;
    lastFetchedIdRef.current = documentId;

    setLoading(true);
    setBodyLoading(true);
    setError("");

    try {
      const docRes = await documentService.getDetail(documentId);
      startTransition(() => {
        setDocument(docRes.data);
      });

      if (docRes.data.docType === "rich_text") {
        const bodyRes = await documentService
          .getBody(documentId)
          .catch(() => null);
        if (bodyRes && bodyRes.byteLength > 0) {
          Y.applyUpdate(ydoc, new Uint8Array(bodyRes));
        }
        const currentEditor = editorRef.current;
        if (currentEditor) {
          startTransition(() => {
            setThreads(readCommentThreads(ydoc, currentEditor));
          });
        }
      }
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : "加载文档失败");
        setDocument(null);
      });
    } finally {
      startTransition(() => {
        setLoading(false);
        setBodyLoading(false);
      });
      fetchInFlightRef.current = false;
    }
  }, [documentId, ydoc]);

  useEffect(() => {
    setDocument(null);
    setBodyData(null);
    setError("");
    fetchDocument();
  }, [fetchDocument]);

  useEffect(() => {
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

  const loadBodyData = useCallback(async () => {
    if (!documentId || !document || document.docType !== "file") {
      return;
    }

    setBodyLoading(true);
    try {
      const bodyRes = await documentService.getBody(documentId);
      startTransition(() => {
        setBodyData(bodyRes);
      });
    } catch {
      startTransition(() => {
        setBodyData(null);
      });
    } finally {
      startTransition(() => {
        setBodyLoading(false);
      });
    }
  }, [documentId, document]);

  useEffect(() => {
    if (document?.docType === "file") {
      loadBodyData();
    }
  }, [document, loadBodyData]);

  useEffect(() => {
    if (!editor || !isRichTextDocument) {
      setPendingSelection(null);
      setThreads([]);
      return;
    }

    syncThreads();

    const handleSelectionChange = () => {
      startTransition(() => {
        setPendingSelection(
          canEditDocument ? getPendingCommentSelection(editor) : null,
        );
      });
    };

    const handleEditorUpdate = () => {
      handleSelectionChange();
      syncThreads();
    };

    handleSelectionChange();
    editor.on("selectionUpdate", handleSelectionChange);
    editor.on("update", handleEditorUpdate);

    const handleYDocUpdate = () => {
      syncThreads();
    };

    ydoc.on("update", handleYDocUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionChange);
      editor.off("update", handleEditorUpdate);
      ydoc.off("update", handleYDocUpdate);
    };
  }, [canEditDocument, editor, isRichTextDocument, syncThreads, ydoc]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    let viewDom: HTMLElement | null = null;
    try {
      viewDom = editor.view?.dom ?? null;
    } catch {
      return;
    }

    if (!viewDom) {
      return;
    }

    const currentAnchors = collectThreadAnchors(editor);
    viewDom
      .querySelectorAll<HTMLElement>("[data-thread-id]")
      .forEach((node) => {
        const threadId = node.dataset.threadId ?? "";
        node.dataset.activeThread =
          threadId === activeThreadId ? "true" : "false";
        node.dataset.anchorInvalid = currentAnchors.has(threadId)
          ? "false"
          : "true";
      });
  }, [activeThreadId, editor, threads]);

  const bodyType = useMemo(() => {
    if (!document) {
      return null;
    }
    if (document.docType === "rich_text") {
      return "rich_text";
    }
    return inferBodyType(document.sourceStorageKey ?? "");
  }, [document]);

  const persistRichTextBody = useCallback(
    async (silent = false) => {
      if (!documentId || !editor) {
        return;
      }

      if (!silent) {
        setSaving(true);
      }
      try {
        const update = Y.encodeStateAsUpdate(ydoc);
        await documentService.putBody(documentId, update);
        setLastSaved(new Date());
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存失败");
        throw err;
      } finally {
        if (!silent) {
          setSaving(false);
        }
      }
    },
    [documentId, editor, ydoc],
  );

  useEffect(() => {
    if (!documentId || !isRichTextDocument || !canEditDocument) {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    const scheduleAutoSave = () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = window.setTimeout(() => {
        persistRichTextBody(true).catch(() => {});
      }, 1800);
    };

    ydoc.on("update", scheduleAutoSave);

    return () => {
      ydoc.off("update", scheduleAutoSave);
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    canEditDocument,
    documentId,
    isRichTextDocument,
    persistRichTextBody,
    ydoc,
  ]);

  const saveBody = async () => {
    await persistRichTextBody(false);
  };

  const saveFileBody = async (data: Uint8Array, fileBodyType: string) => {
    if (!documentId) {
      return;
    }

    setSaving(true);
    try {
      await documentService.putFileBody(documentId, data, fileBodyType);
      setLastSaved(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateMeta = async (values: DocumentMetaValues) => {
    if (!documentId) {
      return;
    }

    setUpdating(true);
    try {
      const res = await documentService.update(documentId, {
        title: values.title.trim(),
        summary: values.summary?.trim() || "",
      });
      setDocument(res.data);
    } finally {
      setUpdating(false);
    }
  };

  const createThread = async (content: string) => {
    if (!editor || !currentUser || !pendingSelection) {
      throw new Error("请先选择需要批注的文本");
    }

    const threadId = createCommentThread(
      ydoc,
      editor,
      currentUser,
      pendingSelection,
      content,
    );
    setActiveThreadId(threadId);
    setPendingSelection(null);
    syncThreads();
    return threadId;
  };

  const replyToThread = async (
    threadId: string,
    content: string,
    parentId: string | null,
  ) => {
    if (!currentUser) {
      throw new Error("当前用户未登录");
    }

    addReplyToThread(ydoc, threadId, currentUser, content, parentId);
    setActiveThreadId(threadId);
    syncThreads();
  };

  const setThreadStatus = async (
    threadId: string,
    status: "open" | "resolved",
  ) => {
    updateThreadStatus(ydoc, threadId, status);
    syncThreads();
  };

  const relocateThread = async (threadId: string) => {
    if (!editor || !pendingSelection) {
      throw new Error("请先选择新的锚点文本");
    }

    relocateThreadAnchor(ydoc, editor, threadId, pendingSelection);
    setActiveThreadId(threadId);
    setPendingSelection(null);
    syncThreads();
  };

  const focusThread = (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) {
      return false;
    }

    setActiveThreadId(threadId);
    return focusThreadAnchor(editor, thread);
  };

  const deleteDocument = async () => {
    if (!documentId) {
      return;
    }

    const workspaceId = document?.workspaceId;
    await documentService.delete(documentId);
    navigate(workspaceId ? `/workspaces/${workspaceId}` : "/workspaces");
  };

  const archiveDocument = async () => {
    if (!documentId) {
      return;
    }

    const workspaceId = document?.workspaceId;
    await documentService.archive(documentId);
    navigate(workspaceId ? `/workspaces/${workspaceId}` : "/workspaces");
  };

  const restoreDocument = async () => {
    if (!documentId) {
      return;
    }

    const res = await documentService.restore(documentId);
    await fetchDocument();
    return res;
  };

  const moveDocument = async (parentId: string | null, sortOrder: number) => {
    if (!documentId) {
      return;
    }

    const res = await documentService.move(documentId, { parentId, sortOrder });
    setDocument(res.data);
    return res.data;
  };

  const downloadDocument = async () => {
    if (!documentId) {
      return;
    }

    const res = await documentService.download(documentId);
    return res.data;
  };

  const handleBack = () => {
    if (document?.workspaceId) {
      navigate(`/workspaces/${document.workspaceId}`);
      return;
    }
    navigate("/workspaces");
  };

  return {
    document,
    editor,
    bodyData,
    bodyType,
    bodyLoading,
    loading,
    saving,
    updating,
    lastSaved,
    error,
    threads,
    activeThreadId,
    pendingSelection,
    collaborators,
    providerStatus,
    canEditDocument,
    fetchDocument,
    loadBodyData,
    saveBody,
    saveFileBody,
    updateMeta,
    createThread,
    replyToThread,
    setThreadStatus,
    relocateThread,
    focusThread,
    setActiveThreadId,
    setPendingSelection,
    deleteDocument,
    archiveDocument,
    restoreDocument,
    moveDocument,
    downloadDocument,
    handleBack,
  };
}
