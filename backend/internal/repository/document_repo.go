package repository

import (
	"context"
	"errors"
	"time"

	"research/internal/domain"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (r *documentRepo) ListOwnedByUser(ctx context.Context, userID string, limit int) ([]domain.Document, error) {
	var docs []domain.Document
	err := r.db.WithContext(ctx).
		Where("owner_user_id = ? AND status <> ?", userID, domain.DocumentStatusDeleted).
		Order("created_at DESC").
		Limit(limit).
		Find(&docs).Error
	return docs, err
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

type documentAccessRepo struct {
	db *gorm.DB
}

func NewDocumentAccessRepository(db *gorm.DB) domain.DocumentAccessRepository {
	return &documentAccessRepo{db: db}
}

func (r *documentAccessRepo) Touch(ctx context.Context, userID, documentID string) error {
	now := time.Now()
	access := domain.DocumentAccess{
		UserID:     userID,
		DocumentID: documentID,
		OpenedAt:   now,
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "document_id"}},
			DoUpdates: clause.Assignments(map[string]any{"opened_at": now, "updated_at": now}),
		}).
		Create(&access).Error
}

func (r *documentAccessRepo) ListRecentByUser(ctx context.Context, userID string, limit int) ([]domain.RecentDocument, error) {
	var docs []domain.RecentDocument
	err := r.db.WithContext(ctx).
		Table("documents").
		Select("documents.*, document_accesses.opened_at").
		Joins("JOIN document_accesses ON document_accesses.document_id = documents.id").
		Where("document_accesses.user_id = ? AND documents.status <> ?", userID, domain.DocumentStatusDeleted).
		Order("document_accesses.opened_at DESC").
		Limit(limit).
		Find(&docs).Error
	return docs, err
}

type documentFavoriteRepo struct {
	db *gorm.DB
}

func NewDocumentFavoriteRepository(db *gorm.DB) domain.DocumentFavoriteRepository {
	return &documentFavoriteRepo{db: db}
}

func (r *documentFavoriteRepo) Add(ctx context.Context, userID, documentID string) error {
	favorite := domain.DocumentFavorite{
		UserID:     userID,
		DocumentID: documentID,
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&favorite).Error
}

func (r *documentFavoriteRepo) Delete(ctx context.Context, userID, documentID string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND document_id = ?", userID, documentID).
		Delete(&domain.DocumentFavorite{}).Error
}

func (r *documentFavoriteRepo) Exists(ctx context.Context, userID, documentID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.DocumentFavorite{}).
		Where("user_id = ? AND document_id = ?", userID, documentID).
		Count(&count).Error
	return count > 0, err
}

func (r *documentFavoriteRepo) ListByUser(ctx context.Context, userID string, limit int) ([]domain.FavoriteDocument, error) {
	var docs []domain.FavoriteDocument
	err := r.db.WithContext(ctx).
		Table("documents").
		Select("documents.*, document_favorites.created_at AS favorited_at").
		Joins("JOIN document_favorites ON document_favorites.document_id = documents.id").
		Where("document_favorites.user_id = ? AND documents.status <> ?", userID, domain.DocumentStatusDeleted).
		Order("document_favorites.created_at DESC").
		Limit(limit).
		Find(&docs).Error
	return docs, err
}
