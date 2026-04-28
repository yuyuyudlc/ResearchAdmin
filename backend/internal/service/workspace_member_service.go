package service

import (
	"context"
	"errors"
	"fmt"

	"research/internal/domain"
)

func (s *DocumentService) ListMembers(ctx context.Context, userID, workspaceID string) ([]WorkspaceMemberItem, error) {
	if _, err := s.getActiveWorkspace(ctx, workspaceID); err != nil {
		return nil, err
	}
	if _, err := s.getWorkspaceMember(ctx, workspaceID, userID); err != nil {
		return nil, ErrForbidden
	}

	var members []domain.WorkspaceMember
	if err := s.db.WithContext(ctx).Where("workspace_id = ?", workspaceID).Order("created_at ASC").Find(&members).Error; err != nil {
		return nil, err
	}

	items := make([]WorkspaceMemberItem, 0, len(members))
	for _, member := range members {
		items = append(items, WorkspaceMemberItem{
			UserID:   member.UserID,
			Role:     member.Role,
			JoinedAt: member.CreatedAt,
		})
	}
	return items, nil
}

func (s *DocumentService) AddMember(ctx context.Context, req UpsertWorkspaceMemberRequest) (*WorkspaceMemberItem, error) {
	if _, err := s.getActiveWorkspace(ctx, req.WorkspaceID); err != nil {
		return nil, err
	}
	if err := s.requireWorkspaceOwner(ctx, req.WorkspaceID, req.OperatorUserID); err != nil {
		return nil, err
	}
	if err := validateWorkspaceRole(req.Role); err != nil {
		return nil, err
	}
	if err := s.ensureUserExists(ctx, req.UserID); err != nil {
		return nil, err
	}

	existing, err := s.getWorkspaceMember(ctx, req.WorkspaceID, req.UserID)
	if err == nil {
		item := WorkspaceMemberItem{UserID: existing.UserID, Role: existing.Role, JoinedAt: existing.CreatedAt}
		return &item, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	member := &domain.WorkspaceMember{
		WorkspaceID: req.WorkspaceID,
		UserID:      req.UserID,
		Role:        req.Role,
	}
	if err := s.db.WithContext(ctx).Create(member).Error; err != nil {
		return nil, err
	}
	item := WorkspaceMemberItem{UserID: member.UserID, Role: member.Role, JoinedAt: member.CreatedAt}
	return &item, nil
}

func (s *DocumentService) UpdateMember(ctx context.Context, req UpsertWorkspaceMemberRequest) (*WorkspaceMemberItem, error) {
	if err := s.requireWorkspaceOwner(ctx, req.WorkspaceID, req.OperatorUserID); err != nil {
		return nil, err
	}
	if err := validateWorkspaceRole(req.Role); err != nil {
		return nil, err
	}

	member, err := s.getWorkspaceMember(ctx, req.WorkspaceID, req.UserID)
	if err != nil {
		return nil, err
	}
	if member.Role == domain.WorkspaceMemberRoleOwner && req.Role != domain.WorkspaceMemberRoleOwner {
		if err := s.ensureWorkspaceKeepsOwner(ctx, req.WorkspaceID); err != nil {
			return nil, err
		}
	}

	if err := s.db.WithContext(ctx).Model(member).Update("role", req.Role).Error; err != nil {
		return nil, err
	}
	item := WorkspaceMemberItem{UserID: member.UserID, Role: req.Role, JoinedAt: member.CreatedAt}
	return &item, nil
}

func (s *DocumentService) RemoveMember(ctx context.Context, operatorUserID, workspaceID, userID string) error {
	if err := s.requireWorkspaceOwner(ctx, workspaceID, operatorUserID); err != nil {
		return err
	}
	member, err := s.getWorkspaceMember(ctx, workspaceID, userID)
	if err != nil {
		return err
	}
	if member.Role == domain.WorkspaceMemberRoleOwner {
		if err := s.ensureWorkspaceKeepsOwner(ctx, workspaceID); err != nil {
			return err
		}
	}
	return s.db.WithContext(ctx).Delete(member).Error
}

func (s *DocumentService) ensureWorkspaceKeepsOwner(ctx context.Context, workspaceID string) error {
	count, err := s.countWorkspaceOwners(ctx, workspaceID)
	if err != nil {
		return err
	}
	if count <= 1 {
		return ErrLastWorkspaceOwner
	}
	return nil
}

func validateWorkspaceRole(role domain.WorkspaceMemberRole) error {
	if role != domain.WorkspaceMemberRoleOwner && role != domain.WorkspaceMemberRoleMember {
		return fmt.Errorf("%w: workspace 成员角色无效", ErrInvalidArgument)
	}
	return nil
}
