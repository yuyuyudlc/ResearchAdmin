export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface User {
  id: string
  username: string
  email: string
  organizationId?: string | null
  organization: string
  avatarUrl: string
  signature: string
  professionalTitle: string
  supervisor: string
  displayName: string
  status?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expiresIn: number
  user: User
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  organization: string
  avatar_url: string
  signature: string
  professional_title: string
  supervisor: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface UpdateProfileRequest {
  username: string
  email: string
  organization: string
  avatar_url: string
  signature: string
  professional_title: string
  supervisor: string
}

export interface Workspace {
  id: string
  name: string
  description: string
  ownerUserId: string
  role?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceListResponse {
  items: Workspace[]
}

export interface CreateWorkspaceRequest {
  name: string
  description: string
}

export interface UpdateWorkspaceRequest {
  name?: string
  description?: string
  status?: string
}

export interface DocumentNode {
  id: string
  workspaceId: string
  parentId: string | null
  title: string
  summary: string
  ownerUserId: string
  docType: string
  status: string
  sortOrder: number
  permissionBit: number
  hasChildren: boolean
  sourceStorageKey?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  userId: string
  role: string
  joinedAt: string
}

export interface WorkspaceDirectoryResponse {
  workspace: Workspace
  currentMember: WorkspaceMember
  parent: DocumentNode | null
  items: DocumentNode[]
  nextCursor: string | null
}

export interface CreateDocumentRequest {
  parentId: string | null
  title: string
  summary: string
  docType: string
}

export interface UpdateDocumentRequest {
  title?: string
  summary?: string
  sourceStorageKey?: string
}

export interface MoveDocumentRequest {
  parentId: string | null
  sortOrder: number
}

export interface AddMemberRequest {
  userId: string
  role: string
}

export interface UpdateMemberRequest {
  role: string
}

export interface ACLItem {
  id: string
  workspaceId: string
  documentId: string
  subjectType: string
  subjectId: string | null
  permissionBit: number
  inherit: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ACLListResponse {
  items: ACLItem[]
}

export interface CreateACLRequest {
  subjectType: string
  subjectId: string | null
  permissionBit: number
  inherit: boolean
}

export interface UpdateACLRequest {
  permissionBit?: number
  inherit?: boolean
}

export interface MyPermissionResponse {
  documentId: string
  permissionBit: number
  canRead: boolean
  canEdit: boolean
  canManage: boolean
}

export interface Comment {
  id: string
  documentId: string
  userId: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CommentListResponse {
  items: Comment[]
}

export interface CreateCommentRequest {
  content: string
}

export interface UpdateCommentStatusRequest {
  status: string
}

export interface DocumentBodyResponse {
  documentId: string
  body: string
  version: number
  updatedAt: string
}

export interface PutBodyRequest {
  body: string
}

export interface UserListResponse {
  items: User[]
}

export interface Organization {
  id: string
  name: string
  description: string
  sortOrder: number
  userCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface OrganizationListResponse {
  items: Organization[]
}

export interface CreateOrganizationRequest {
  name: string
  description?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
  sortOrder?: number
}

export interface MoveOrganizationUsersRequest {
  targetOrgId: string
}

export interface AdminUserListResponse {
  items: User[]
  total: number
  page: number
  pageSize: number
}

export interface AdminCreateUserRequest {
  username: string
  email: string
  organizationId?: string | null
  professionalTitle?: string
  supervisor?: string
}

export interface AdminUpdateUserRequest {
  username?: string
  email?: string
  professionalTitle?: string
  supervisor?: string
  signature?: string
  avatarUrl?: string
}

export interface AdminCreateUserResponse {
  user: User
  initialPassword: string
}

export interface AdminMoveUserRequest {
  organizationId?: string | null
}

export interface AdminResetPasswordResponse {
  initialPassword: string
}

export interface AdminListUsersQuery {
  organizationId?: string | null | 'unassigned'
  q?: string
  page?: number
  pageSize?: number
}

export interface SearchRequest {
  q?: string
  workspaceId?: string
  parentId?: string
  docType?: string
  ownerUserId?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface SpreadsheetMetaField {
  field: string
  name: string
  type?: 'dimension' | 'metric'
  formatter?: string
}

export interface SpreadsheetConfig {
  rows: string[]
  columns: string[]
  values: string[]
  meta: SpreadsheetMetaField[]
}

export interface SpreadsheetRecord {
  [key: string]: string | number | null | undefined
}

export interface SpreadsheetFilter {
  field: string
  operator: 'contains' | 'equals' | 'greater' | 'less'
  value: string
}

export interface SpreadsheetSort {
  field: string | null
  order: 'asc' | 'desc'
}

export interface SpreadsheetBlockState {
  blockId: string
  title: string
  mode: 'pivot' | 'table'
  config: SpreadsheetConfig
  filters: SpreadsheetFilter[]
  sort: SpreadsheetSort
  activeMetric: string | null
}

export interface SpreadsheetBlockResponse {
  code?: number
  message?: string
  blockId: string
  title: string
  mode: 'pivot' | 'table'
  config: SpreadsheetConfig
  records: SpreadsheetRecord[]
  filters?: SpreadsheetFilter[]
  sort?: SpreadsheetSort
  activeMetric?: string | null
  updatedAt?: string
}

export const PERMISSION = {
  READ: 1,
  EDIT: 2,
  MANAGE: 4,
  DENY: 8,
} as const

export function canRead(bit: number): boolean {
  return (bit & PERMISSION.READ) !== 0
}

export function canEdit(bit: number): boolean {
  return (bit & PERMISSION.EDIT) !== 0
}

export function canManage(bit: number): boolean {
  return (bit & PERMISSION.MANAGE) !== 0
}