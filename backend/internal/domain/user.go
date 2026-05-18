package domain

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

var ErrUserNotFound = errors.New("用户不存在")

type ProfessionalTitle string

const (
	ProfessionalTitleProfessor          ProfessionalTitle = "professor"
	ProfessionalTitleAssociateProfessor ProfessionalTitle = "associate_professor"
	ProfessionalTitleLecturer           ProfessionalTitle = "lecturer"
	ProfessionalTitleResearcher         ProfessionalTitle = "researcher"
	ProfessionalTitleEngineer           ProfessionalTitle = "engineer"
	ProfessionalTitleDoctoralStudent    ProfessionalTitle = "doctoral_student"
	ProfessionalTitleMasterStudent      ProfessionalTitle = "master_student"
	ProfessionalTitleOther              ProfessionalTitle = "other"
)

type User struct {
	ID                string            `gorm:"type:char(36);primaryKey" json:"id"`
	Username          string            `gorm:"not null" json:"username"`
	Email             string            `gorm:"uniqueIndex" json:"email"`
	Organization      string            `json:"organization"`
	AvatarURL         string            `json:"avatar_url"`
	Signature         string            `json:"signature"`
	ProfessionalTitle ProfessionalTitle `gorm:"type:varchar(32)" json:"professional_title"`
	Supervisor        string            `json:"supervisor"`
	DisplayName       string            `gorm:"size:64" json:"display_name"`
	Status            string            `gorm:"size:32;not null;default:active" json:"status"`
	LastLoginAt       *time.Time        `json:"last_login_at"`
	PasswordHash      string            `gorm:"not null"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID != "" {
		return nil
	}
	id, err := NewUUID()
	if err != nil {
		return err
	}
	u.ID = id
	return nil
}

// UserRepository 接口：隔离数据库实现
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) error
	UpdatePasswordHash(ctx context.Context, userID string, passwordHash string) error
	UpdateProfile(ctx context.Context, user *User) error
	UpdateLastLoginAt(ctx context.Context, userID string, lastLoginAt time.Time) error
}
