package service

import (
	"context"
	"errors"
	"strings"

	"research/internal/domain"
)

func (s *DocumentService) getActiveWorkspace(ctx context.Context, workspaceID string) (*domain.Workspace, error) {
	return s.workspaceRepo.GetActiveByID(ctx, workspaceID)
}

func (s *DocumentService) getWorkspaceMember(ctx context.Context, workspaceID, userID string) (*domain.WorkspaceMember, error) {
	return s.workspaceMemberRepo.GetByWorkspaceAndUser(ctx, workspaceID, userID)
}

func (s *DocumentService) getDocument(ctx context.Context, documentID string) (*domain.Document, error) {
	doc, err := s.documentRepo.GetByID(ctx, documentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return doc, nil
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
	_, err := s.userRepo.GetByID(ctx, userID)
	if errors.Is(err, domain.ErrUserNotFound) {
		return ErrNotFound
	}
	return err
}

func (s *DocumentService) countWorkspaceOwners(ctx context.Context, workspaceID string) (int64, error) {
	return s.workspaceMemberRepo.CountOwners(ctx, workspaceID)
}

func (s *DocumentService) nextSortOrder(ctx context.Context, workspaceID string, parentID *string) (int, error) {
	return s.documentRepo.NextSortOrder(ctx, workspaceID, parentID)
}

func (s *DocumentService) documentItem(ctx context.Context, doc *domain.Document, perm int) (DocumentItem, error) {
	hasChildren, err := s.documentRepo.HasChildren(ctx, doc.ID)
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
