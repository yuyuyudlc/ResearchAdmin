package repository

import (
	"context"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type documentBodyRepo struct {
	db *gorm.DB
}

func NewDocumentBodyRepository(db *gorm.DB) domain.DocumentBodyRepository {
	return &documentBodyRepo{db: db}
}

func (r *documentBodyRepo) Create(ctx context.Context, body *domain.DocumentBody) error {
	return r.db.WithContext(ctx).Create(body).Error
}

func (r *documentBodyRepo) GetByDocumentID(ctx context.Context, documentID string) (*domain.DocumentBody, error) {
	var body domain.DocumentBody
	err := r.db.WithContext(ctx).Where("document_id = ?", documentID).First(&body).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &body, nil
}

func (r *documentBodyRepo) Update(ctx context.Context, documentID string, data []byte, bodyType string) error {
	body := &domain.DocumentBody{}
	if err := r.db.WithContext(ctx).Where("document_id = ?", documentID).First(body).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			body = &domain.DocumentBody{
				DocumentID: documentID,
				BodyType:   bodyType,
				Data:       data,
				Size:       int64(len(data)),
			}
			return r.db.WithContext(ctx).Create(body).Error
		}
		return err
	}
	return r.db.WithContext(ctx).Model(body).Updates(map[string]any{
		"body_type": bodyType,
		"data":      data,
		"size":      int64(len(data)),
	}).Error
}

func (r *documentBodyRepo) Delete(ctx context.Context, documentID string) error {
	result := r.db.WithContext(ctx).Where("document_id = ?", documentID).Delete(&domain.DocumentBody{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}
