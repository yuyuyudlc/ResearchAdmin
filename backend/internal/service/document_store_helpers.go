package service

import (
	"context"
	"errors"
	"strings"

	"research/internal/domain"

	"gorm.io/gorm"
)

func (s *DocumentService) getActiveWorkspace(ctx context.Context, workspaceID string) (*domain.Workspace, error) {
	var workspace domain.Workspace
	err := s.db.WithContext(ctx).
		Where("id = ? AND status <> ?", workspaceID, domain.WorkspaceStatusDeleted).
		First(&workspace).Error
	if err != nil {
		return nil, mapNotFound(err)
	}
	return &workspace, nil
}

func (s *DocumentService) getWorkspaceMember(ctx context.Context, workspaceID, userID string) (*domain.WorkspaceMember, error) {
	var member domain.WorkspaceMember
	err := s.db.WithContext(ctx).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		First(&member).Error
	if err != nil {
		return nil, mapNotFound(err)
	}
	return &member, nil
}

func (s *DocumentService) getDocument(ctx context.Context, documentID string) (*domain.Document, error) {
	var doc domain.Document
	err := s.db.WithContext(ctx).
		Where("id = ? AND status <> ?", documentID, domain.DocumentStatusDeleted).
		First(&doc).Error
	if err != nil {
		return nil, mapNotFound(err)
	}
	return &doc, nil
}

func (s *DocumentService) requireWorkspaceOwner(ctx context.Context, workspaceID, userID string) error {
	member, err := s.getWorkspaceMember(ctx, workspaceID, userID)
	if err != nil {
		return ErrForbidden
	}
	if member.Role != domain.WorkspaceMemberRoleOwner {
		return ErrForbidden
	}
	return nil
}

func (s *DocumentService) ensureUserExists(ctx context.Context, userID string) error {
	var count int64
	if err := s.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *DocumentService) countWorkspaceOwners(ctx context.Context, workspaceID string) (int64, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&domain.WorkspaceMember{}).
		Where("workspace_id = ? AND role = ?", workspaceID, domain.WorkspaceMemberRoleOwner).
		Count(&count).Error
	return count, err
}

func (s *DocumentService) nextSortOrder(ctx context.Context, workspaceID string, parentID *string) (int, error) {
	var maxSort *int
	query := s.db.WithContext(ctx).Model(&domain.Document{}).Where("workspace_id = ?", workspaceID)
	if parentID != nil && *parentID != "" {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	if err := query.Select("MAX(sort_order)").Scan(&maxSort).Error; err != nil {
		return 0, err
	}
	if maxSort == nil {
		return 1000, nil
	}
	return *maxSort + 1000, nil
}

func (s *DocumentService) documentItem(ctx context.Context, doc *domain.Document, perm int) (DocumentItem, error) {
	hasChildren, err := s.hasChildren(ctx, doc.ID)
	if err != nil {
		return DocumentItem{}, err
	}
	return DocumentItem{
		ID:               doc.ID,
		WorkspaceID:      doc.WorkspaceID,
		ParentID:         doc.ParentID,
		Title:            doc.Title,
		Summary:          doc.Summary,
		OwnerUserID:      doc.OwnerUserID,
		DocType:          doc.DocType,
		Status:           doc.Status,
		SortOrder:        doc.SortOrder,
		SourceStorageKey: doc.SourceStorageKey,
		PermissionBit:    perm,
		HasChildren:      hasChildren,
		CreatedAt:        doc.CreatedAt,
		UpdatedAt:        doc.UpdatedAt,
	}, nil
}

func (s *DocumentService) hasChildren(ctx context.Context, documentID string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&domain.Document{}).
		Where("parent_id = ? AND status <> ?", documentID, domain.DocumentStatusDeleted).
		Count(&count).Error
	return count > 0, err
}

func (s *DocumentService) isDescendant(ctx context.Context, ancestorID, candidateID string) (bool, error) {
	currentID := candidateID
	for currentID != "" {
		doc, err := s.getDocument(ctx, currentID)
		if err != nil {
			return false, err
		}
		if doc.ParentID == nil || *doc.ParentID == "" {
			return false, nil
		}
		if *doc.ParentID == ancestorID {
			return true, nil
		}
		currentID = *doc.ParentID
	}
	return false, nil
}

func normalizeIDPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func mapNotFound(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}
