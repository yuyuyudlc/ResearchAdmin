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
	if len(req.BodyData) > 0 {
		bodyType := req.BodyType
		if bodyType == "" {
			bodyType = domain.BodyTypeYjsState
		}
		if err := s.bodyRepo.Update(ctx, doc.ID, req.BodyData, bodyType); err != nil {
			return nil, err
		}
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
	if s.documentAccessRepo != nil {
		_ = s.documentAccessRepo.Touch(ctx, userID, doc.ID)
	}
	item, err := s.documentItem(ctx, doc, perm)
	if err != nil {
		return nil, err
	}
	item.Favorited = s.isFavorite(ctx, userID, doc.ID)
	return &item, nil
}

func (s *DocumentService) ListHomeDocuments(ctx context.Context, req HomeDocumentListRequest) (*HomeDocumentListResponse, error) {
	limit := req.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var docs []domain.Document
	var recentDocs []domain.RecentDocument
	var favoriteDocs []domain.FavoriteDocument
	var err error
	switch req.Scope {
	case "mine":
		docs, err = s.documentRepo.ListOwnedByUser(ctx, req.UserID, limit)
	case "recent":
		if s.documentAccessRepo == nil {
			recentDocs = []domain.RecentDocument{}
		} else {
			recentDocs, err = s.documentAccessRepo.ListRecentByUser(ctx, req.UserID, limit)
		}
	case "favorite":
		if s.documentFavoriteRepo == nil {
			favoriteDocs = []domain.FavoriteDocument{}
		} else {
			favoriteDocs, err = s.documentFavoriteRepo.ListByUser(ctx, req.UserID, limit)
		}
	default:
		return nil, fmt.Errorf("%w: scope 无效", ErrInvalidArgument)
	}
	if err != nil {
		return nil, err
	}

	items := make([]DocumentItem, 0, len(docs))
	if req.Scope == "recent" {
		items = make([]DocumentItem, 0, len(recentDocs))
		for i := range recentDocs {
			item, err := s.readableDocumentItem(ctx, req.UserID, &recentDocs[i].Document)
			if err != nil {
				return nil, err
			}
			if item == nil {
				continue
			}
			item.OpenedAt = recentDocs[i].OpenedAt
			items = append(items, *item)
		}
		return &HomeDocumentListResponse{Items: items}, nil
	}
	if req.Scope == "favorite" {
		items = make([]DocumentItem, 0, len(favoriteDocs))
		for i := range favoriteDocs {
			item, err := s.readableDocumentItem(ctx, req.UserID, &favoriteDocs[i].Document)
			if err != nil {
				return nil, err
			}
			if item == nil {
				continue
			}
			item.Favorited = true
			item.FavoritedAt = favoriteDocs[i].FavoritedAt
			items = append(items, *item)
		}
		return &HomeDocumentListResponse{Items: items}, nil
	}

	for i := range docs {
		item, err := s.readableDocumentItem(ctx, req.UserID, &docs[i])
		if err != nil {
			return nil, err
		}
		if item != nil {
			items = append(items, *item)
		}
	}
	return &HomeDocumentListResponse{Items: items}, nil
}

func (s *DocumentService) FavoriteDocument(ctx context.Context, userID, documentID string) (*DocumentItem, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return nil, err
	}
	if s.documentFavoriteRepo != nil {
		if err := s.documentFavoriteRepo.Add(ctx, userID, documentID); err != nil {
			return nil, err
		}
	}
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return nil, err
	}
	item, err := s.documentItem(ctx, doc, perm)
	if err != nil {
		return nil, err
	}
	item.Favorited = true
	return &item, nil
}

func (s *DocumentService) UnfavoriteDocument(ctx context.Context, userID, documentID string) error {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return err
	}
	if s.documentFavoriteRepo == nil {
		return nil
	}
	return s.documentFavoriteRepo.Delete(ctx, userID, documentID)
}

func (s *DocumentService) readableDocumentItem(ctx context.Context, userID string, doc *domain.Document) (*DocumentItem, error) {
	perm, err := s.ComputePermission(ctx, userID, doc)
	if err != nil {
		return nil, err
	}
	if !hasPermission(perm, domain.PermissionRead) {
		return nil, nil
	}
	item, err := s.documentItem(ctx, doc, perm)
	if err != nil {
		return nil, err
	}
	item.Favorited = s.isFavorite(ctx, userID, doc.ID)
	return &item, nil
}

func (s *DocumentService) isFavorite(ctx context.Context, userID, documentID string) bool {
	if s.documentFavoriteRepo == nil {
		return false
	}
	ok, err := s.documentFavoriteRepo.Exists(ctx, userID, documentID)
	return err == nil && ok
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
