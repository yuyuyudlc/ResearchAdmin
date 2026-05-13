package service

import (
	"context"
	"fmt"
	"strings"

	"research/internal/domain"
)

func (s *DocumentService) ListACL(ctx context.Context, userID, documentID string) ([]ACLResponse, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionManage); err != nil {
		return nil, err
	}

	acl, err := s.docACLRepo.ListByDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}

	items := make([]ACLResponse, 0, len(acl))
	for _, item := range acl {
		items = append(items, aclResponse(&item))
	}
	return items, nil
}

func (s *DocumentService) CreateACL(ctx context.Context, req CreateACLRequest) (*ACLResponse, error) {
	doc, err := s.getDocument(ctx, req.DocumentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, req.UserID, doc, domain.PermissionManage); err != nil {
		return nil, err
	}
	if err := s.validateACL(ctx, req.SubjectType, req.SubjectID, req.PermissionBit); err != nil {
		return nil, err
	}

	acl := &domain.DocACL{
		WorkspaceID:   doc.WorkspaceID,
		DocumentID:    doc.ID,
		SubjectType:   req.SubjectType,
		SubjectID:     normalizeIDPtr(req.SubjectID),
		PermissionBit: req.PermissionBit,
		Inherit:       req.Inherit,
		CreatedBy:     req.UserID,
	}
	if err := s.docACLRepo.Create(ctx, acl); err != nil {
		return nil, err
	}

	resp := aclResponse(acl)
	return &resp, nil
}

func (s *DocumentService) UpdateACL(ctx context.Context, req UpdateACLRequest) (*ACLResponse, error) {
	doc, err := s.getDocument(ctx, req.DocumentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, req.UserID, doc, domain.PermissionManage); err != nil {
		return nil, err
	}

	acl, err := s.docACLRepo.GetByID(ctx, req.ACLID, req.DocumentID)
	if err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if req.PermissionBit != nil {
		if err := validatePermissionBit(*req.PermissionBit); err != nil {
			return nil, err
		}
		updates["permission_bit"] = *req.PermissionBit
	}
	if req.Inherit != nil {
		updates["inherit"] = *req.Inherit
	}
	if len(updates) > 0 {
		if err := s.docACLRepo.Update(ctx, acl.ID, updates); err != nil {
			return nil, err
		}
		acl, err = s.docACLRepo.GetByID(ctx, acl.ID, req.DocumentID)
		if err != nil {
			return nil, err
		}
	}

	resp := aclResponse(acl)
	return &resp, nil
}

func (s *DocumentService) DeleteACL(ctx context.Context, userID, documentID, aclID string) error {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionManage); err != nil {
		return err
	}

	if err := s.docACLRepo.Delete(ctx, aclID, documentID); err != nil {
		return err
	}
	return nil
}

func (s *DocumentService) validateACL(ctx context.Context, subjectType domain.ACLSubjectType, subjectID *string, permissionBit int) error {
	if subjectType != domain.ACLSubjectTypeUser && subjectType != domain.ACLSubjectTypePublic {
		return fmt.Errorf("%w: ACL 主体类型无效", ErrInvalidArgument)
	}
	if subjectType == domain.ACLSubjectTypeUser {
		if subjectID == nil || strings.TrimSpace(*subjectID) == "" {
			return fmt.Errorf("%w: user 类型 ACL 必须提供 subjectId", ErrInvalidArgument)
		}
		if err := s.ensureUserExists(ctx, strings.TrimSpace(*subjectID)); err != nil {
			return err
		}
	}
	if subjectType == domain.ACLSubjectTypePublic && subjectID != nil && strings.TrimSpace(*subjectID) != "" {
		return fmt.Errorf("%w: public 类型 ACL 不能提供 subjectId", ErrInvalidArgument)
	}
	return validatePermissionBit(permissionBit)
}

func validatePermissionBit(permissionBit int) error {
	if permissionBit == domain.PermissionDeny {
		return nil
	}
	if permissionBit <= 0 || permissionBit&^fullPermission != 0 {
		return fmt.Errorf("%w: permissionBit 无效", ErrInvalidArgument)
	}
	return nil
}

func aclResponse(acl *domain.DocACL) ACLResponse {
	return ACLResponse{
		ID:            acl.ID,
		WorkspaceID:   acl.WorkspaceID,
		DocumentID:    acl.DocumentID,
		SubjectType:   acl.SubjectType,
		SubjectID:     acl.SubjectID,
		PermissionBit: acl.PermissionBit,
		Inherit:       acl.Inherit,
		CreatedBy:     acl.CreatedBy,
		CreatedAt:     acl.CreatedAt,
		UpdatedAt:     acl.UpdatedAt,
	}
}
