package domain

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("资源不存在")

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *Workspace) error
	GetActiveByID(ctx context.Context, id string) (*Workspace, error)
	Update(ctx context.Context, id string, updates map[string]any) error
	SoftDelete(ctx context.Context, id string) error
	ListByUserID(ctx context.Context, userID string) ([]WorkspaceWithRole, error)
}

type WorkspaceWithRole struct {
	ID          string
	Name        string
	Description string
	OwnerUserID string
	Role        WorkspaceMemberRole
	Status      WorkspaceStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type WorkspaceMemberRepository interface {
	Create(ctx context.Context, member *WorkspaceMember) error
	GetByWorkspaceAndUser(ctx context.Context, workspaceID, userID string) (*WorkspaceMember, error)
	ListByWorkspace(ctx context.Context, workspaceID string) ([]WorkspaceMember, error)
	UpdateRole(ctx context.Context, workspaceID, userID string, role WorkspaceMemberRole) error
	Delete(ctx context.Context, workspaceID, userID string) error
	CountOwners(ctx context.Context, workspaceID string) (int64, error)
}

type DocumentRepository interface {
	Create(ctx context.Context, doc *Document) error
	GetByID(ctx context.Context, id string) (*Document, error)
	Update(ctx context.Context, id string, updates map[string]any) error
	ListChildren(ctx context.Context, workspaceID string, parentID *string, status DocumentStatus, limit int) ([]Document, error)
	HasChildren(ctx context.Context, documentID string) (bool, error)
	NextSortOrder(ctx context.Context, workspaceID string, parentID *string) (int, error)
}

type DocumentBodyRepository interface {
	Create(ctx context.Context, body *DocumentBody) error
	GetByDocumentID(ctx context.Context, documentID string) (*DocumentBody, error)
	Update(ctx context.Context, documentID string, data []byte, bodyType string) error
	Delete(ctx context.Context, documentID string) error
}

type DocACLRepository interface {
	Create(ctx context.Context, acl *DocACL) error
	ListByDocument(ctx context.Context, documentID string) ([]DocACL, error)
	GetByID(ctx context.Context, id, documentID string) (*DocACL, error)
	Update(ctx context.Context, id string, updates map[string]any) error
	Delete(ctx context.Context, id, documentID string) error
	FindMatched(ctx context.Context, docID string, inheritedIDs []string, userID string) ([]DocACL, error)
}
