package service

import (
	"context"
	"errors"

	"research/internal/domain"
)

func (s *DocumentService) GetWorkspaceDirectory(ctx context.Context, userID, workspaceID string, parentID *string, status domain.DocumentStatus, limit int) (*WorkspaceDirectoryResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	workspace, err := s.getActiveWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	member, err := s.getWorkspaceMember(ctx, workspaceID, userID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	parent, parentResp, err := s.resolveDirectoryParent(ctx, userID, workspaceID, parentID)
	if err != nil {
		return nil, err
	}
	if parent == nil && member == nil {
		return nil, ErrForbidden
	}

	items, err := s.readDirectoryItems(ctx, userID, workspaceID, parent, status, limit)
	if err != nil {
		return nil, err
	}

	var currentMember *CurrentMemberResponse
	if member != nil {
		currentMember = &CurrentMemberResponse{UserID: member.UserID, Role: member.Role}
	}
	return &WorkspaceDirectoryResponse{
		Workspace:     *workspaceResponse(workspace, false),
		CurrentMember: currentMember,
		Parent:        parentResp,
		Items:         items,
		NextCursor:    nil,
	}, nil
}

func (s *DocumentService) resolveDirectoryParent(ctx context.Context, userID, workspaceID string, parentID *string) (*domain.Document, *ParentResponse, error) {
	if parentID == nil || *parentID == "" {
		return nil, nil, nil
	}
	parent, err := s.getDocument(ctx, *parentID)
	if err != nil {
		return nil, nil, err
	}
	if parent.WorkspaceID != workspaceID {
		return nil, nil, ErrNotFound
	}

	perm, err := s.ComputePermission(ctx, userID, parent)
	if err != nil {
		return nil, nil, err
	}
	if !hasPermission(perm, domain.PermissionRead) {
		return nil, nil, ErrForbidden
	}
	resp := &ParentResponse{ID: parent.ID, Title: parent.Title, PermissionBit: perm}
	return parent, resp, nil
}

func (s *DocumentService) readDirectoryItems(ctx context.Context, userID, workspaceID string, parent *domain.Document, status domain.DocumentStatus, limit int) ([]DocumentItem, error) {
	var docs []domain.Document
	query := s.db.WithContext(ctx).Where("workspace_id = ? AND status = ?", workspaceID, status)
	if parent != nil {
		query = query.Where("parent_id = ?", parent.ID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	if err := query.Order("sort_order ASC, created_at ASC").Limit(limit).Find(&docs).Error; err != nil {
		return nil, err
	}

	items := make([]DocumentItem, 0, len(docs))
	for i := range docs {
		perm, err := s.ComputePermission(ctx, userID, &docs[i])
		if err != nil {
			return nil, err
		}
		if !hasPermission(perm, domain.PermissionRead) {
			continue
		}
		item, err := s.documentItem(ctx, &docs[i], perm)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
