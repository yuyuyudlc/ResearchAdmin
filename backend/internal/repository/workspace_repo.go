package repository

import (
	"context"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type workspaceRepo struct {
	db *gorm.DB
}

func NewWorkspaceRepository(db *gorm.DB) domain.WorkspaceRepository {
	return &workspaceRepo{db: db}
}

func (r *workspaceRepo) Create(ctx context.Context, workspace *domain.Workspace) error {
	return r.db.WithContext(ctx).Create(workspace).Error
}

func (r *workspaceRepo) GetActiveByID(ctx context.Context, id string) (*domain.Workspace, error) {
	var workspace domain.Workspace
	err := r.db.WithContext(ctx).
		Where("id = ? AND status <> ?", id, domain.WorkspaceStatusDeleted).
		First(&workspace).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &workspace, nil
}

func (r *workspaceRepo) Update(ctx context.Context, id string, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&domain.Workspace{}).Where("id = ?", id).Updates(updates).Error
}

func (r *workspaceRepo) SoftDelete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&domain.Workspace{}).Where("id = ?", id).Update("status", domain.WorkspaceStatusDeleted).Error
}

func (r *workspaceRepo) ListByUserID(ctx context.Context, userID string) ([]domain.WorkspaceWithRole, error) {
	var rows []domain.WorkspaceWithRole
	err := r.db.WithContext(ctx).
		Table("workspaces").
		Select("workspaces.id, workspaces.name, workspaces.description, workspaces.owner_user_id, workspaces.status, workspaces.created_at, workspaces.updated_at, workspace_members.role").
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ? AND workspaces.status <> ?", userID, domain.WorkspaceStatusDeleted).
		Order("workspaces.created_at ASC").
		Scan(&rows).Error
	return rows, err
}
