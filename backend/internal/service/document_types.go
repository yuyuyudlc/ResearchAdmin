package service

import "research/internal/domain"

type CreateWorkspaceRequest struct {
	UserID      string
	Name        string
	Description string
}

type UpdateWorkspaceRequest struct {
	UserID      string
	WorkspaceID string
	Name        *string
	Description *string
	Status      *domain.WorkspaceStatus
}

type WorkspaceItem struct {
	ID          string                     `json:"id"`
	Name        string                     `json:"name"`
	Description string                     `json:"description"`
	OwnerUserID string                     `json:"ownerUserId"`
	Role        domain.WorkspaceMemberRole `json:"role"`
	Status      domain.WorkspaceStatus     `json:"status"`
	CreatedAt   any                        `json:"createdAt"`
	UpdatedAt   any                        `json:"updatedAt"`
}

type WorkspaceResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	OwnerUserID string                 `json:"ownerUserId"`
	Status      domain.WorkspaceStatus `json:"status"`
	CreatedAt   any                    `json:"createdAt,omitempty"`
	UpdatedAt   any                    `json:"updatedAt,omitempty"`
}

type CurrentMemberResponse struct {
	UserID string                     `json:"userId"`
	Role   domain.WorkspaceMemberRole `json:"role"`
}

type ParentResponse struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	PermissionBit int    `json:"permissionBit"`
}

type DocumentItem struct {
	ID               string                `json:"id"`
	WorkspaceID      string                `json:"workspaceId"`
	ParentID         *string               `json:"parentId"`
	Title            string                `json:"title"`
	Summary          string                `json:"summary"`
	OwnerUserID      string                `json:"ownerUserId"`
	DocType          domain.DocumentType   `json:"docType"`
	Status           domain.DocumentStatus `json:"status"`
	SortOrder        int                   `json:"sortOrder"`
	SourceStorageKey string                `json:"sourceStorageKey,omitempty"`
	PermissionBit    int                   `json:"permissionBit"`
	HasChildren      bool                  `json:"hasChildren"`
	CreatedAt        any                   `json:"createdAt"`
	UpdatedAt        any                   `json:"updatedAt"`
}

type WorkspaceDirectoryResponse struct {
	Workspace     WorkspaceResponse      `json:"workspace"`
	CurrentMember *CurrentMemberResponse `json:"currentMember"`
	Parent        *ParentResponse        `json:"parent"`
	Items         []DocumentItem         `json:"items"`
	NextCursor    *string                `json:"nextCursor"`
}

type WorkspaceMemberItem struct {
	UserID   string                     `json:"userId"`
	Role     domain.WorkspaceMemberRole `json:"role"`
	JoinedAt any                        `json:"joinedAt"`
}

type UpsertWorkspaceMemberRequest struct {
	OperatorUserID string
	WorkspaceID    string
	UserID         string
	Role           domain.WorkspaceMemberRole
}

type CreateDocumentRequest struct {
	UserID           string
	WorkspaceID      string
	ParentID         *string
	Title            string
	Summary          string
	DocType          domain.DocumentType
	SourceStorageKey string
	BodyData         []byte
	BodyType         string
}

type UpdateDocumentRequest struct {
	UserID           string
	DocumentID       string
	Title            *string
	Summary          *string
	SourceStorageKey *string
}

type MoveDocumentRequest struct {
	UserID     string
	DocumentID string
	ParentID   *string
	SortOrder  int
}

type PermissionResponse struct {
	DocumentID    string `json:"documentId"`
	PermissionBit int    `json:"permissionBit"`
	CanRead       bool   `json:"canRead"`
	CanEdit       bool   `json:"canEdit"`
	CanManage     bool   `json:"canManage"`
}

type CreateACLRequest struct {
	UserID        string
	DocumentID    string
	SubjectType   domain.ACLSubjectType
	SubjectID     *string
	PermissionBit int
	Inherit       bool
}

type UpdateACLRequest struct {
	UserID        string
	DocumentID    string
	ACLID         string
	PermissionBit *int
	Inherit       *bool
}

type ACLResponse struct {
	ID            string                `json:"id"`
	WorkspaceID   string                `json:"workspaceId"`
	DocumentID    string                `json:"documentId"`
	SubjectType   domain.ACLSubjectType `json:"subjectType"`
	SubjectID     *string               `json:"subjectId"`
	PermissionBit int                   `json:"permissionBit"`
	Inherit       bool                  `json:"inherit"`
	CreatedBy     string                `json:"createdBy"`
	CreatedAt     any                   `json:"createdAt"`
	UpdatedAt     any                   `json:"updatedAt"`
}
