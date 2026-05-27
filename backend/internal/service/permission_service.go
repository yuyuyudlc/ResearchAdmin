package service

import (
	"context"
	"errors"

	"research/internal/domain"
	"research/internal/requestcontext"
)

func (s *DocumentService) MyPermission(ctx context.Context, userID, documentID string) (*PermissionResponse, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return nil, err
	}
	return &PermissionResponse{
		DocumentID:    doc.ID,
		PermissionBit: perm,
		CanRead:       hasPermission(perm, domain.PermissionRead),
		CanEdit:       hasPermission(perm, domain.PermissionEdit),
		CanManage:     hasPermission(perm, domain.PermissionManage),
	}, nil
}

func (s *DocumentService) ComputePermission(ctx context.Context, userID string, doc *domain.Document) (int, error) {
	if doc.OwnerUserID == userID {
		return fullPermission, nil
	}

	member, err := s.getWorkspaceMember(ctx, doc.WorkspaceID, userID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return 0, err
	}
	if member != nil && member.Role == domain.WorkspaceMemberRoleOwner {
		return fullPermission, nil
	}

	permission := 0
	if member != nil && member.Role == domain.WorkspaceMemberRoleMember {
		permission = domain.PermissionRead | domain.PermissionEdit
	}

	acl, err := s.matchedACL(ctx, doc, userID)
	if err != nil {
		return 0, err
	}
	for _, item := range acl {
		if item.PermissionBit&domain.PermissionDeny != 0 {
			return 0, nil
		}
		permission |= item.PermissionBit & fullPermission
	}
	return permission, nil
}

func (s *DocumentService) requireDocumentPermission(ctx context.Context, userID string, doc *domain.Document, bit int) error {
	if requestcontext.IsInternalRequest(ctx) {
		return nil
	}
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return err
	}
	if !hasPermission(perm, bit) {
		return ErrForbidden
	}
	return nil
}

func (s *DocumentService) matchedACL(ctx context.Context, doc *domain.Document, userID string) ([]domain.DocACL, error) {
	_, inheritedIDs, err := s.aclDocumentIDs(ctx, doc)
	if err != nil {
		return nil, err
	}

	acl, err := s.docACLRepo.FindMatched(ctx, doc.ID, inheritedIDs, userID)
	return acl, err
}

func (s *DocumentService) aclDocumentIDs(ctx context.Context, doc *domain.Document) ([]string, []string, error) {
	all := []string{doc.ID}
	inherited := []string{}
	current := doc

	for current.ParentID != nil && *current.ParentID != "" {
		parent, err := s.getDocument(ctx, *current.ParentID)
		if err != nil {
			return nil, nil, err
		}
		inherited = append(inherited, parent.ID)
		all = append(all, parent.ID)
		current = parent
	}
	return all, inherited, nil
}

func hasPermission(permissionBit, required int) bool {
	return permissionBit&required == required
}
