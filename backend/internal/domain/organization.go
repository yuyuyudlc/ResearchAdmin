package domain

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

var ErrOrganizationNotFound = errors.New("机构不存在")

type Organization struct {
	ID          string    `gorm:"type:char(36);primaryKey" json:"id"`
	Name        string    `gorm:"size:128;not null;uniqueIndex" json:"name"`
	Description string    `json:"description"`
	SortOrder   int       `gorm:"not null;default:0" json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (o *Organization) BeforeCreate(_ *gorm.DB) error {
	if o.ID != "" {
		return nil
	}
	id, err := NewUUID()
	if err != nil {
		return err
	}
	o.ID = id
	return nil
}

// OrganizationDetail 用于列表场景下携带 userCount
type OrganizationDetail struct {
	Organization
	UserCount int64 `json:"userCount"`
}

// OrganizationRepository 机构仓储接口
type OrganizationRepository interface {
	List(ctx context.Context, q string) ([]OrganizationDetail, error)
	GetByID(ctx context.Context, id string) (*Organization, error)
	GetByName(ctx context.Context, name string) (*Organization, error)
	Create(ctx context.Context, org *Organization) error
	Update(ctx context.Context, org *Organization) error
	Delete(ctx context.Context, id string) error
	CountUsers(ctx context.Context, id string) (int64, error)
}