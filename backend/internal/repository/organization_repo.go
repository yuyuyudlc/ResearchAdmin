package repository

import (
	"context"
	"errors"
	"strings"

	"research/internal/domain"

	"gorm.io/gorm"
)

type orgRepo struct {
	db *gorm.DB
}

func NewOrganizationRepository(db *gorm.DB) domain.OrganizationRepository {
	return &orgRepo{db: db}
}

func (r *orgRepo) List(ctx context.Context, q string) ([]domain.OrganizationDetail, error) {
	// 一次性 JOIN 计数；空 user 视为 0
	type row struct {
		ID          string
		Name        string
		Description string
		SortOrder   int
		CreatedAt   any
		UpdatedAt   any
		UserCount   int64
	}

	query := r.db.WithContext(ctx).
		Table("organizations AS o").
		Select(`o.id, o.name, o.description, o.sort_order, o.created_at, o.updated_at,
                (SELECT COUNT(1) FROM users u WHERE u.organization_id = o.id) AS user_count`)

	if trimmed := strings.TrimSpace(q); trimmed != "" {
		like := "%" + trimmed + "%"
		query = query.Where("o.name LIKE ? OR o.description LIKE ?", like, like)
	}

	var rows []row
	if err := query.
		Order("o.sort_order ASC, o.name ASC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]domain.OrganizationDetail, 0, len(rows))
	for _, x := range rows {
		result = append(result, domain.OrganizationDetail{
			Organization: domain.Organization{
				ID:          x.ID,
				Name:        x.Name,
				Description: x.Description,
				SortOrder:   x.SortOrder,
			},
			UserCount: x.UserCount,
		})
	}
	return result, nil
}

func (r *orgRepo) GetByID(ctx context.Context, id string) (*domain.Organization, error) {
	var org domain.Organization
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&org).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrOrganizationNotFound
		}
		return nil, err
	}
	return &org, nil
}

func (r *orgRepo) GetByName(ctx context.Context, name string) (*domain.Organization, error) {
	var org domain.Organization
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&org).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrOrganizationNotFound
		}
		return nil, err
	}
	return &org, nil
}

func (r *orgRepo) Create(ctx context.Context, org *domain.Organization) error {
	return r.db.WithContext(ctx).Create(org).Error
}

func (r *orgRepo) Update(ctx context.Context, org *domain.Organization) error {
	return r.db.WithContext(ctx).
		Model(&domain.Organization{}).
		Where("id = ?", org.ID).
		Updates(map[string]any{
			"name":        org.Name,
			"description": org.Description,
			"sort_order":  org.SortOrder,
		}).Error
}

func (r *orgRepo) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Organization{}).Error
}

func (r *orgRepo) CountUsers(ctx context.Context, id string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("organization_id = ?", id).
		Count(&count).Error
	return count, err
}