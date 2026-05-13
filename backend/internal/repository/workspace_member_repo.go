package repository

import (
	"context"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type workspaceMemberRepo struct {
	db *gorm.DB
}

func NewWorkspaceMemberRepository(db *gorm.DB) domain.WorkspaceMemberRepository {
	return &workspaceMemberRepo{db: db}
}

func (r *workspaceMemberRepo) Create(ctx context.Context, member *domain.WorkspaceMember) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *workspaceMemberRepo) GetByWorkspaceAndUser(ctx context.Context, workspaceID, userID string) (*domain.WorkspaceMember, error) {
	var member domain.WorkspaceMember
	err := r.db.WithContext(ctx).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &member, nil
}

func (r *workspaceMemberRepo) ListByWorkspace(ctx context.Context, workspaceID string) ([]domain.WorkspaceMember, error) {
	var members []domain.WorkspaceMember
	err := r.db.WithContext(ctx).Where("workspace_id = ?", workspaceID).Order("created_at ASC").Find(&members).Error
	return members, err
}

func (r *workspaceMemberRepo) UpdateRole(ctx context.Context, workspaceID, userID string, role domain.WorkspaceMemberRole) error {
	return r.db.WithContext(ctx).
		Model(&domain.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Update("role", role).Error
}

func (r *workspaceMemberRepo) Delete(ctx context.Context, workspaceID, userID string) error {
	return r.db.WithContext(ctx).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Delete(&domain.WorkspaceMember{}).Error
}

func (r *workspaceMemberRepo) CountOwners(ctx context.Context, workspaceID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.WorkspaceMember{}).
		Where("workspace_id = ? AND role = ?", workspaceID, domain.WorkspaceMemberRoleOwner).
		Count(&count).Error
	return count, err
}
