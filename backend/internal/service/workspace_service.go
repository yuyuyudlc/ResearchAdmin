package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"research/internal/domain"

	"gorm.io/gorm"
)

func (s *DocumentService) CreateWorkspace(ctx context.Context, req CreateWorkspaceRequest) (*WorkspaceResponse, error) {
	name := strings.TrimSpace(req.Name)
	if req.UserID == "" || name == "" {
		return nil, fmt.Errorf("%w: workspace 名称不能为空", ErrInvalidArgument)
	}

	workspace := &domain.Workspace{
		Name:        name,
		Description: strings.TrimSpace(req.Description),
		OwnerUserID: req.UserID,
		Status:      domain.WorkspaceStatusActive,
	}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(workspace).Error; err != nil {
			return err
		}
		member := &domain.WorkspaceMember{
			WorkspaceID: workspace.ID,
			UserID:      req.UserID,
			Role:        domain.WorkspaceMemberRoleOwner,
		}
		return tx.Create(member).Error
	})
	if err != nil {
		return nil, err
	}
	return workspaceResponse(workspace, true), nil
}

func (s *DocumentService) ListWorkspaces(ctx context.Context, userID string) ([]WorkspaceItem, error) {
	var rows []struct {
		ID          string
		Name        string
		Description string
		OwnerUserID string
		Role        domain.WorkspaceMemberRole
		Status      domain.WorkspaceStatus
		CreatedAt   time.Time
		UpdatedAt   time.Time
	}
	err := s.db.WithContext(ctx).
		Table("workspaces").
		Select("workspaces.id, workspaces.name, workspaces.description, workspaces.owner_user_id, workspaces.status, workspaces.created_at, workspaces.updated_at, workspace_members.role").
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ? AND workspaces.status <> ?", userID, domain.WorkspaceStatusDeleted).
		Order("workspaces.created_at ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	items := make([]WorkspaceItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, WorkspaceItem{
			ID:          row.ID,
			Name:        row.Name,
			Description: row.Description,
			OwnerUserID: row.OwnerUserID,
			Role:        row.Role,
			Status:      row.Status,
			CreatedAt:   row.CreatedAt,
			UpdatedAt:   row.UpdatedAt,
		})
	}
	return items, nil
}

func (s *DocumentService) UpdateWorkspace(ctx context.Context, req UpdateWorkspaceRequest) (*WorkspaceResponse, error) {
	workspace, err := s.getActiveWorkspace(ctx, req.WorkspaceID)
	if err != nil {
		return nil, err
	}
	if err := s.requireWorkspaceOwner(ctx, workspace.ID, req.UserID); err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("%w: workspace 名称不能为空", ErrInvalidArgument)
		}
		updates["name"] = name
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.Status != nil {
		if *req.Status != domain.WorkspaceStatusActive && *req.Status != domain.WorkspaceStatusDeleted {
			return nil, fmt.Errorf("%w: workspace 状态无效", ErrInvalidArgument)
		}
		updates["status"] = *req.Status
	}
	if len(updates) == 0 {
		return workspaceResponse(workspace, true), nil
	}
	if err := s.db.WithContext(ctx).Model(workspace).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).First(workspace, "id = ?", workspace.ID).Error; err != nil {
		return nil, err
	}
	return workspaceResponse(workspace, true), nil
}

func (s *DocumentService) DeleteWorkspace(ctx context.Context, userID, workspaceID string) error {
	if _, err := s.getActiveWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	if err := s.requireWorkspaceOwner(ctx, workspaceID, userID); err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&domain.Workspace{}).Where("id = ?", workspaceID).Update("status", domain.WorkspaceStatusDeleted).Error
}

func workspaceResponse(workspace *domain.Workspace, includeTime bool) *WorkspaceResponse {
	resp := &WorkspaceResponse{
		ID:          workspace.ID,
		Name:        workspace.Name,
		Description: workspace.Description,
		OwnerUserID: workspace.OwnerUserID,
		Status:      workspace.Status,
	}
	if includeTime {
		resp.CreatedAt = workspace.CreatedAt
		resp.UpdatedAt = workspace.UpdatedAt
	}
	return resp
}
