package service

import (
	"context"
	"errors"
	"fmt"

	"research/internal/domain"
)

func (s *DocumentService) PutBody(ctx context.Context, userID, documentID string, bodyType string, data []byte) error {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionEdit); err != nil {
		return err
	}

	if doc.DocType == domain.DocumentTypeRichText && bodyType != domain.BodyTypeYjsState {
		return fmt.Errorf("%w: 富文本文档仅支持 yjs_state 类型正文", ErrInvalidArgument)
	}
	if doc.DocType == domain.DocumentTypeFile && bodyType == domain.BodyTypeYjsState {
		return fmt.Errorf("%w: 文件型文档不支持 yjs_state 类型正文", ErrInvalidArgument)
	}

	return s.bodyRepo.Update(ctx, documentID, data, bodyType)
}

func (s *DocumentService) GetBody(ctx context.Context, userID, documentID string) (*domain.DocumentBody, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return nil, err
	}

	body, err := s.bodyRepo.GetByDocumentID(ctx, documentID)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, ErrNotFound
	}
	return body, err
}
