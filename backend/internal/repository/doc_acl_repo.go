package repository

import (
	"context"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type docACLRepo struct {
	db *gorm.DB
}

func NewDocACLRepository(db *gorm.DB) domain.DocACLRepository {
	return &docACLRepo{db: db}
}

func (r *docACLRepo) Create(ctx context.Context, acl *domain.DocACL) error {
	return r.db.WithContext(ctx).Create(acl).Error
}

func (r *docACLRepo) ListByDocument(ctx context.Context, documentID string) ([]domain.DocACL, error) {
	var acl []domain.DocACL
	err := r.db.WithContext(ctx).Where("document_id = ?", documentID).Order("created_at ASC").Find(&acl).Error
	return acl, err
}

func (r *docACLRepo) GetByID(ctx context.Context, id, documentID string) (*domain.DocACL, error) {
	var acl domain.DocACL
	err := r.db.WithContext(ctx).Where("id = ? AND document_id = ?", id, documentID).First(&acl).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &acl, nil
}

func (r *docACLRepo) Update(ctx context.Context, id string, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&domain.DocACL{}).Where("id = ?", id).Updates(updates).Error
}

func (r *docACLRepo) Delete(ctx context.Context, id, documentID string) error {
	result := r.db.WithContext(ctx).Where("id = ? AND document_id = ?", id, documentID).Delete(&domain.DocACL{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *docACLRepo) FindMatched(ctx context.Context, docID string, inheritedIDs []string, userID string) ([]domain.DocACL, error) {
	var acl []domain.DocACL
	query := r.db.WithContext(ctx).Where(
		"((document_id = ?) OR (document_id IN ? AND inherit = ?))",
		docID, inheritedIDs, true,
	)
	query = query.Where(
		"(subject_type = ? AND subject_id = ?) OR subject_type = ?",
		domain.ACLSubjectTypeUser, userID, domain.ACLSubjectTypePublic,
	)
	err := query.Find(&acl).Error
	return acl, err
}
