import { useCallback, useEffect, useState } from 'react'
import type { Workspace, WorkspaceMember } from '../../../services/types'
import { workspaceService } from '../../../services/workspace'

export interface WorkspaceFormValues {
  name: string
  description?: string
}

export interface MemberFormValues {
  userId: string
  role: string
}

export function useWorkspaceList() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await workspaceService.list()
      setWorkspaces(res.data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载工作区失败')
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const createWorkspace = async (values: WorkspaceFormValues) => {
    setSubmitting(true)
    try {
      await workspaceService.create({
        name: values.name.trim(),
        description: values.description?.trim() || '',
      })
      await fetchWorkspaces()
    } finally {
      setSubmitting(false)
    }
  }

  const updateWorkspace = async (
    workspaceId: string,
    values: WorkspaceFormValues,
  ) => {
    setSubmitting(true)
    try {
      await workspaceService.update(workspaceId, {
        name: values.name.trim(),
        description: values.description?.trim() || '',
      })
      await fetchWorkspaces()
    } finally {
      setSubmitting(false)
    }
  }

  const deleteWorkspace = async (workspaceId: string) => {
    setSubmitting(true)
    try {
      await workspaceService.delete(workspaceId)
      await fetchWorkspaces()
    } finally {
      setSubmitting(false)
    }
  }

  const fetchMembers = async (workspaceId: string) => {
    setMembersLoading(true)
    try {
      const res = await workspaceService.listMembers(workspaceId)
      setMembers(res.data.items)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const addMember = async (workspaceId: string, values: MemberFormValues) => {
    await workspaceService.addMember(workspaceId, {
      userId: values.userId.trim(),
      role: values.role,
    })
    await fetchMembers(workspaceId)
  }

  const removeMember = async (workspaceId: string, userId: string) => {
    await workspaceService.removeMember(workspaceId, userId)
    await fetchMembers(workspaceId)
  }

  return {
    workspaces,
    loading,
    submitting,
    members,
    membersLoading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchMembers,
    addMember,
    removeMember,
  }
}
