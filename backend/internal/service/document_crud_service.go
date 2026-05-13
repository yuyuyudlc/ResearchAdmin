package service

import (
	"context"
	"fmt"
	"strings"

	"research/internal/domain"
)

func (s *DocumentService) CreateDocument(ctx context.Context, req CreateDocumentRequest) (*DocumentItem, error) {
	if _, err := s.getActiveWorkspace(ctx, req.WorkspaceID); err != nil {
		return nil, err
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, fmt.Errorf("%w: 文档标题不能为空", ErrInvalidArgument)
	}

	docType := req.DocType
	if docType == "" {
		docType = domain.DocumentTypeRichText
	}
	if docType != domain.DocumentTypeRichText && docType != domain.DocumentTypeFile {
		return nil, fmt.Errorf("%w: 文档类型无效", ErrInvalidArgument)
	}
	if err := s.requireCreateDocumentPermission(ctx, req); err != nil {
		return nil, err
	}

	sortOrder, err := s.nextSortOrder(ctx, req.WorkspaceID, req.ParentID)
	if err != nil {
		return nil, err
	}
	doc := &domain.Document{
		WorkspaceID:      req.WorkspaceID,
		ParentID:         normalizeIDPtr(req.ParentID),
		Title:            title,
		Summary:          strings.TrimSpace(req.Summary),
		OwnerUserID:      req.UserID,
		DocType:          docType,
		Status:           domain.DocumentStatusActive,
		SortOrder:        sortOrder,
		SourceStorageKey: strings.TrimSpace(req.SourceStorageKey),
	}
	if err := s.documentRepo.Create(ctx, doc); err != nil {
		return nil, err
	}
	return s.documentItemWithCurrentPermission(ctx, req.UserID, doc)
}

func (s *DocumentService) GetDocumentDetail(ctx context.Context, userID, documentID string) (*DocumentItem, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return nil, err
	}
	if !hasPermission(perm, domain.PermissionRead) {
		return nil, ErrForbidden
	}
	item, err := s.documentItem(ctx, doc, perm)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *DocumentService) UpdateDocument(ctx context.Context, req UpdateDocumentRequest) (*DocumentItem, error) {
	doc, err := s.getDocument(ctx, req.DocumentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, req.UserID, doc, domain.PermissionEdit); err != nil {
		return nil, err
	}

	updates := map[string]any{}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, fmt.Errorf("%w: 文档标题不能为空", ErrInvalidArgument)
		}
		updates["title"] = title
	}
	if req.Summary != nil {
		updates["summary"] = strings.TrimSpace(*req.Summary)
	}
	if req.SourceStorageKey != nil {
		updates["source_storage_key"] = strings.TrimSpace(*req.SourceStorageKey)
	}
	if len(updates) > 0 {
		if err := s.documentRepo.Update(ctx, doc.ID, updates); err != nil {
			return nil, err
		}
		doc, err = s.getDocument(ctx, doc.ID)
		if err != nil {
			return nil, err
		}
	}
	return s.documentItemWithCurrentPermission(ctx, req.UserID, doc)
}

func (s *DocumentService) MoveDocument(ctx context.Context, req MoveDocumentRequest) (*DocumentItem, error) {
	doc, err := s.getDocument(ctx, req.DocumentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, req.UserID, doc, domain.PermissionManage); err != nil {
		return nil, err
	}

	parentID := normalizeIDPtr(req.ParentID)
	if err := s.validateMoveTarget(ctx, doc, parentID); err != nil {
		return nil, err
	}

	updates := map[string]any{"parent_id": parentID, "sort_order": req.SortOrder}
	if req.SortOrder <= 0 {
		next, err := s.nextSortOrder(ctx, doc.WorkspaceID, parentID)
		if err != nil {
			return nil, err
		}
		updates["sort_order"] = next
	}
	if err := s.documentRepo.Update(ctx, doc.ID, updates); err != nil {
		return nil, err
	}
	doc, err = s.getDocument(ctx, doc.ID)
	if err != nil {
		return nil, err
	}
	return s.documentItemWithCurrentPermission(ctx, req.UserID, doc)
}

func (s *DocumentService) SetDocumentStatus(ctx context.Context, userID, documentID string, status domain.DocumentStatus) error {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionManage); err != nil {
		return err
	}
	return s.documentRepo.Update(ctx, documentID, map[string]any{"status": status})
}

func (s *DocumentService) requireCreateDocumentPermission(ctx context.Context, req CreateDocumentRequest) error {
	if req.ParentID != nil && *req.ParentID != "" {
		parent, err := s.getDocument(ctx, *req.ParentID)
		if err != nil {
			return err
		}
		if parent.WorkspaceID != req.WorkspaceID {
			return ErrNotFound
		}
		perm, err := s.ComputePermission(ctx, req.UserID, parent)
		if err != nil {
			return err
		}
		if !hasPermission(perm, domain.PermissionEdit) {
			return ErrForbidden
		}
		return nil
	}
	if _, err := s.getWorkspaceMember(ctx, req.WorkspaceID, req.UserID); err != nil {
		return ErrForbidden
	}
	return nil
}

func (s *DocumentService) validateMoveTarget(ctx context.Context, doc *domain.Document, parentID *string) error {
	if parentID == nil {
		return nil
	}
	if *parentID == doc.ID {
		return fmt.Errorf("%w: 不能移动到自己下面", ErrInvalidArgument)
	}
	parent, err := s.getDocument(ctx, *parentID)
	if err != nil {
		return err
	}
	if parent.WorkspaceID != doc.WorkspaceID {
		return fmt.Errorf("%w: 目标父文档不属于同一 workspace", ErrInvalidArgument)
	}
	descendant, err := s.isDescendant(ctx, doc.ID, parent.ID)
	if err != nil {
		return err
	}
	if descendant {
		return fmt.Errorf("%w: 不能移动到自己的子文档下面", ErrInvalidArgument)
	}
	return nil
}

func (s *DocumentService) documentItemWithCurrentPermission(ctx context.Context, userID string, doc *domain.Document) (*DocumentItem, error) {
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return nil, err
	}
	item, err := s.documentItem(ctx, doc, perm)
	if err != nil {
		return nil, err
	}
	return &item, nil
}
