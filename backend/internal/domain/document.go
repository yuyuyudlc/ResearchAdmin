package domain

import "time"

type WorkspaceStatus string

const (
	WorkspaceStatusActive  WorkspaceStatus = "active"
	WorkspaceStatusDeleted WorkspaceStatus = "deleted"
)

type WorkspaceMemberRole string

const (
	WorkspaceMemberRoleOwner  WorkspaceMemberRole = "owner"
	WorkspaceMemberRoleMember WorkspaceMemberRole = "member"
)

type DocumentType string

const (
	DocumentTypeRichText DocumentType = "rich_text"
	DocumentTypeFile     DocumentType = "file"
)

type DocumentStatus string

const (
	DocumentStatusActive   DocumentStatus = "active"
	DocumentStatusArchived DocumentStatus = "archived"
	DocumentStatusDeleted  DocumentStatus = "deleted"
)

type ACLSubjectType string

const (
	ACLSubjectTypeUser   ACLSubjectType = "user"
	ACLSubjectTypePublic ACLSubjectType = "public"
)

const (
	PermissionRead   = 1
	PermissionEdit   = 2
	PermissionManage = 4
	PermissionDeny   = 8
)

type Workspace struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Name        string          `gorm:"size:128;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	OwnerUserID uint            `gorm:"not null;index" json:"owner_user_id"`
	Status      WorkspaceStatus `gorm:"size:32;not null;default:active;index" json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type WorkspaceMember struct {
	ID          uint                `gorm:"primaryKey" json:"id"`
	WorkspaceID uint                `gorm:"not null;uniqueIndex:idx_workspace_member;index" json:"workspace_id"`
	UserID      uint                `gorm:"not null;uniqueIndex:idx_workspace_member;index" json:"user_id"`
	Role        WorkspaceMemberRole `gorm:"size:32;not null" json:"role"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type Document struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	WorkspaceID      uint           `gorm:"not null;index:idx_documents_parent_sort,priority:1;index" json:"workspace_id"`
	ParentID         *uint          `gorm:"index:idx_documents_parent_sort,priority:2" json:"parent_id"`
	Title            string         `gorm:"size:255;not null" json:"title"`
	Summary          string         `gorm:"type:text" json:"summary"`
	OwnerUserID      uint           `gorm:"not null;index" json:"owner_user_id"`
	DocType          DocumentType   `gorm:"size:32;not null" json:"doc_type"`
	Status           DocumentStatus `gorm:"size:32;not null;default:active;index" json:"status"`
	SortOrder        int            `gorm:"not null;default:1000;index:idx_documents_parent_sort,priority:3" json:"sort_order"`
	SourceStorageKey string         `gorm:"size:255" json:"source_storage_key"`
	CreatedAt        time.Time      `gorm:"index:idx_documents_parent_sort,priority:4" json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type DocACL struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	WorkspaceID   uint           `gorm:"not null;index" json:"workspace_id"`
	DocumentID    uint           `gorm:"not null;index:idx_doc_acl_subject,priority:1;index" json:"document_id"`
	SubjectType   ACLSubjectType `gorm:"size:32;not null;index:idx_doc_acl_subject,priority:2" json:"subject_type"`
	SubjectID     *uint          `gorm:"index:idx_doc_acl_subject,priority:3" json:"subject_id"`
	PermissionBit int            `gorm:"not null" json:"permission_bit"`
	Inherit       bool           `gorm:"not null;default:false" json:"inherit"`
	CreatedBy     uint           `gorm:"not null;index" json:"created_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

func (DocACL) TableName() string {
	return "doc_acl"
}
