package repository

import (
	"context"
	"errors"
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
	err := r.db.WithContext(ctx).First(&user, id).Error
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
