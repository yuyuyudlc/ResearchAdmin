package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"research/internal/domain"

	"gorm.io/gorm"
)

type userRepo struct {
	db *gorm.DB
}

// NewUserRepository 构造函数
func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepo) UpdatePasswordHash(ctx context.Context, userID string, passwordHash string) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", userID).
		Update("password_hash", passwordHash).
		Error
}

func (r *userRepo) UpdateProfile(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", user.ID).
		Updates(map[string]any{
			"username":           user.Username,
			"email":              user.Email,
			"organization":       user.Organization,
			"avatar_url":         user.AvatarURL,
			"signature":          user.Signature,
			"professional_title": user.ProfessionalTitle,
			"supervisor":         user.Supervisor,
			"display_name":       user.DisplayName,
		}).
		Error
}

func (r *userRepo) UpdateLastLoginAt(ctx context.Context, userID string, lastLoginAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", userID).
		Update("last_login_at", lastLoginAt).
		Error
}

func (r *userRepo) AdminUpdate(ctx context.Context, userID string, update domain.AdminUserUpdate) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"username":           update.Username,
			"email":              update.Email,
			"avatar_url":         update.AvatarURL,
			"signature":          update.Signature,
			"professional_title": update.ProfessionalTitle,
			"supervisor":         update.Supervisor,
			"display_name":       update.DisplayName,
		}).Error
}

func (r *userRepo) UpdateStatus(ctx context.Context, userID, status string) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", userID).
		Update("status", status).Error
}

// UpdateOrganization 同步更新 organization_id 与冗余 organization 字段。
// orgID == nil 表示「未分配」，orgName 期望传空串。
func (r *userRepo) UpdateOrganization(ctx context.Context, userID string, orgID *string, orgName string) error {
	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"organization_id": orgID,
			"organization":    orgName,
		}).Error
}

func (r *userRepo) Delete(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Where("id = ?", userID).Delete(&domain.User{}).Error
}

// List 管理员侧列表，按机构 + 搜索 + 分页。
func (r *userRepo) List(ctx context.Context, filter domain.UserListFilter) ([]*domain.User, int64, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	query := r.db.WithContext(ctx).Model(&domain.User{})
	switch {
	case filter.OrganizationID != nil:
		query = query.Where("organization_id = ?", *filter.OrganizationID)
	case filter.IncludeUnassigned:
		query = query.Where("organization_id IS NULL")
	}

	if q := strings.TrimSpace(filter.Q); q != "" {
		like := "%" + q + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []*domain.User
	err := query.
		Order("created_at DESC").
		Limit(filter.PageSize).
		Offset((filter.Page - 1) * filter.PageSize).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

// MoveAllByOrganization 批量把 fromOrgID 下的用户搬到 toOrgID。
// toOrgID == nil 表示搬到「未分配」。返回受影响行数。
func (r *userRepo) MoveAllByOrganization(ctx context.Context, fromOrgID string, toOrgID *string, toOrgName string) (int64, error) {
	tx := r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("organization_id = ?", fromOrgID).
		Updates(map[string]any{
			"organization_id": toOrgID,
			"organization":    toOrgName,
		})
	return tx.RowsAffected, tx.Error
}