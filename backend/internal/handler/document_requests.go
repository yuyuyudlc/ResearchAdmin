package handler

import "research/internal/domain"

type createWorkspaceRequest struct {
	Name        string `json:"name" binding:"required" example:"研发空间"`
	Description string `json:"description" example:"项目资料"`
}

type updateWorkspaceRequest struct {
	Name        *string                 `json:"name"`
	Description *string                 `json:"description"`
	Status      *domain.WorkspaceStatus `json:"status"`
}

type memberRequest struct {
	UserID string                     `json:"userId" binding:"required" example:"00000000-0000-0000-0000-000000000000"`
	Role   domain.WorkspaceMemberRole `json:"role" binding:"required" example:"member"`
}

type updateMemberRequest struct {
	Role domain.WorkspaceMemberRole `json:"role" binding:"required" example:"member"`
}

type createDocumentRequest struct {
	ParentID         *string             `json:"parentId" example:""`
	Title            string              `json:"title" binding:"required" example:"需求文档"`
	Summary          string              `json:"summary" example:""`
	DocType          domain.DocumentType `json:"docType" example:"rich_text"`
	SourceStorageKey string              `json:"sourceStorageKey" example:""`
}

type updateDocumentRequest struct {
	Title            *string `json:"title" example:"需求文档"`
	Summary          *string `json:"summary" example:""`
	SourceStorageKey *string `json:"sourceStorageKey" example:""`
}

type moveDocumentRequest struct {
	ParentID  *string `json:"parentId" example:""`
	SortOrder int     `json:"sortOrder" example:"1000"`
}

type createACLRequest struct {
	SubjectType   domain.ACLSubjectType `json:"subjectType" binding:"required" example:"user"`
	SubjectID     *string               `json:"subjectId" example:"00000000-0000-0000-0000-000000000000"`
	PermissionBit int                   `json:"permissionBit" binding:"required" example:"3"`
	Inherit       bool                  `json:"inherit" example:"true"`
}

type updateACLRequest struct {
	PermissionBit *int  `json:"permissionBit" example:"1"`
	Inherit       *bool `json:"inherit" example:"true"`
}
