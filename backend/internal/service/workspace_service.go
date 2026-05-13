package service

import (
	"context"
	"fmt"
	"strings"

	"research/internal/domain"
)

func (s *DocumentService) CreatePrivateWorkspace(ctx context.Context, userID string) error {
	workspace := &domain.Workspace{
		Name:        "我的私人空间",
		Description: "仅自己可见的私人文档",
		OwnerUserID: userID,
		Status:      domain.WorkspaceStatusActive,
	}
	if err := s.workspaceRepo.Create(ctx, workspace); err != nil {
		return err
	}
	member := &domain.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        domain.WorkspaceMemberRoleOwner,
	}
	return s.workspaceMemberRepo.Create(ctx, member)
}

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
	if err := s.workspaceRepo.Create(ctx, workspace); err != nil {
		return nil, err
	}
	member := &domain.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      req.UserID,
		Role:        domain.WorkspaceMemberRoleOwner,
	}
	if err := s.workspaceMemberRepo.Create(ctx, member); err != nil {
		return nil, err
	}
	return workspaceResponse(workspace, true), nil
}

func (s *DocumentService) ListWorkspaces(ctx context.Context, userID string) ([]WorkspaceItem, error) {
	rows, err := s.workspaceRepo.ListByUserID(ctx, userID)
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
	if err := s.workspaceRepo.Update(ctx, workspace.ID, updates); err != nil {
		return nil, err
	}
	workspace, err = s.getActiveWorkspace(ctx, workspace.ID)
	if err != nil {
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
	return s.workspaceRepo.SoftDelete(ctx, workspaceID)
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
