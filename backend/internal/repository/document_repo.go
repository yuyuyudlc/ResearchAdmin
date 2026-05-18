package repository

import (
	"context"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type documentRepo struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) domain.DocumentRepository {
	return &documentRepo{db: db}
}

func (r *documentRepo) Create(ctx context.Context, doc *domain.Document) error {
	return r.db.WithContext(ctx).Create(doc).Error
}

func (r *documentRepo) GetByID(ctx context.Context, id string) (*domain.Document, error) {
	var doc domain.Document
	err := r.db.WithContext(ctx).
		Where("id = ? AND status <> ?", id, domain.DocumentStatusDeleted).
		First(&doc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &doc, nil
}

func (r *documentRepo) Update(ctx context.Context, id string, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&domain.Document{}).Where("id = ?", id).Updates(updates).Error
}

func (r *documentRepo) ListChildren(ctx context.Context, workspaceID string, parentID *string, status domain.DocumentStatus, limit int) ([]domain.Document, error) {
	var docs []domain.Document
	query := r.db.WithContext(ctx).Where("workspace_id = ? AND status = ?", workspaceID, status)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	err := query.Order("sort_order ASC, created_at ASC").Limit(limit).Find(&docs).Error
	return docs, err
}

func (r *documentRepo) HasChildren(ctx context.Context, documentID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Document{}).
		Where("parent_id = ? AND status <> ?", documentID, domain.DocumentStatusDeleted).
		Count(&count).Error
	return count > 0, err
}

func (r *documentRepo) NextSortOrder(ctx context.Context, workspaceID string, parentID *string) (int, error) {
	var maxSort *int
	query := r.db.WithContext(ctx).Model(&domain.Document{}).Where("workspace_id = ?", workspaceID)
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
