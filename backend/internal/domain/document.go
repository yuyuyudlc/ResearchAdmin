package domain

import (
	"time"

	"gorm.io/gorm"
)

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
	ID          string          `gorm:"type:char(36);primaryKey" json:"id"`
	Name        string          `gorm:"size:128;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	OwnerUserID string          `gorm:"type:char(36);not null;index" json:"owner_user_id"`
	Status      WorkspaceStatus `gorm:"size:32;not null;default:active;index" json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type WorkspaceMember struct {
	ID          string              `gorm:"type:char(36);primaryKey" json:"id"`
	WorkspaceID string              `gorm:"type:char(36);not null;uniqueIndex:idx_workspace_member;index" json:"workspace_id"`
	UserID      string              `gorm:"type:char(36);not null;uniqueIndex:idx_workspace_member;index" json:"user_id"`
	Role        WorkspaceMemberRole `gorm:"size:32;not null" json:"role"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type Document struct {
	ID               string         `gorm:"type:char(36);primaryKey" json:"id"`
	WorkspaceID      string         `gorm:"type:char(36);not null;index:idx_documents_parent_sort,priority:1;index" json:"workspace_id"`
	ParentID         *string        `gorm:"type:char(36);index:idx_documents_parent_sort,priority:2" json:"parent_id"`
	Title            string         `gorm:"size:255;not null" json:"title"`
	Summary          string         `gorm:"type:text" json:"summary"`
	OwnerUserID      string         `gorm:"type:char(36);not null;index" json:"owner_user_id"`
	DocType          DocumentType   `gorm:"size:32;not null" json:"doc_type"`
	Status           DocumentStatus `gorm:"size:32;not null;default:active;index" json:"status"`
	SortOrder        int            `gorm:"not null;default:1000;index:idx_documents_parent_sort,priority:3" json:"sort_order"`
	SourceStorageKey string         `gorm:"size:255" json:"source_storage_key"`
	CreatedAt        time.Time      `gorm:"index:idx_documents_parent_sort,priority:4" json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type DocACL struct {
	ID            string         `gorm:"type:char(36);primaryKey" json:"id"`
	WorkspaceID   string         `gorm:"type:char(36);not null;index" json:"workspace_id"`
	DocumentID    string         `gorm:"type:char(36);not null;index:idx_doc_acl_subject,priority:1;index" json:"document_id"`
	SubjectType   ACLSubjectType `gorm:"size:32;not null;index:idx_doc_acl_subject,priority:2" json:"subject_type"`
	SubjectID     *string        `gorm:"type:char(36);index:idx_doc_acl_subject,priority:3" json:"subject_id"`
	PermissionBit int            `gorm:"not null" json:"permission_bit"`
	Inherit       bool           `gorm:"not null;default:false" json:"inherit"`
	CreatedBy     string         `gorm:"type:char(36);not null;index" json:"created_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

const (
	BodyTypeYjsState = "yjs_state"
	BodyTypePdf      = "pdf"
	BodyTypeWord     = "word"
	BodyTypeVideo    = "video"
)

type DocumentBody struct {
	ID         string    `gorm:"type:char(36);primaryKey" json:"id"`
	DocumentID string    `gorm:"type:char(36);not null;uniqueIndex" json:"document_id"`
	BodyType   string    `gorm:"size:32;not null" json:"body_type"`
	Data       []byte    `gorm:"type:blob" json:"-"`
	Size       int64     `gorm:"not null;default:0" json:"size"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (b *DocumentBody) BeforeCreate(_ *gorm.DB) error {
	return assignUUID(&b.ID)
}

func (DocumentBody) TableName() string {
	return "document_bodies"
}

func (w *Workspace) BeforeCreate(_ *gorm.DB) error {
	return assignUUID(&w.ID)
}

func (m *WorkspaceMember) BeforeCreate(_ *gorm.DB) error {
	return assignUUID(&m.ID)
}

func (d *Document) BeforeCreate(_ *gorm.DB) error {
	return assignUUID(&d.ID)
}

func (a *DocACL) BeforeCreate(_ *gorm.DB) error {
	return assignUUID(&a.ID)
}

func (DocACL) TableName() string {
	return "doc_acl"
}

func assignUUID(target *string) error {
	if *target != "" {
		return nil
	}
	id, err := NewUUID()
	if err != nil {
		return err
	}
	*target = id
	return nil
}
