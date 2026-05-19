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
	OrganizationID    *string           `gorm:"type:char(36);index" json:"organization_id"`
	Organization      string            `json:"organization"`
	AvatarURL         string            `json:"avatar_url"`
	Signature         string            `json:"signature"`
	ProfessionalTitle ProfessionalTitle `gorm:"type:varchar(32)" json:"professional_title"`
	Supervisor        string            `json:"supervisor"`
	DisplayName       string            `gorm:"size:64" json:"display_name"`
	Status            string            `gorm:"size:32;not null;default:active" json:"status"`
	LastLoginAt       *time.Time        `json:"last_login_at"`
	PasswordHash      string            `gorm:"not null" json:"-"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

const (
	UserStatusActive   = "active"
	UserStatusDisabled = "disabled"
)

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

// AdminUserUpdate 管理员侧用户字段更新（不含密码与机构）
type AdminUserUpdate struct {
	Username          string
	Email             string
	AvatarURL         string
	Signature         string
	ProfessionalTitle ProfessionalTitle
	Supervisor        string
	DisplayName       string
}

// UserListFilter 管理员用户列表过滤
type UserListFilter struct {
	OrganizationID    *string // nil=不限；非 nil 但 *=""="未分配"
	IncludeUnassigned bool    // true 表示 OrganizationID=nil 时筛选未分配（org_id IS NULL）
	Q                 string  // 模糊匹配 username/email/display_name
	Page              int
	PageSize          int
}

// UserRepository 接口：隔离数据库实现
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) error
	UpdatePasswordHash(ctx context.Context, userID string, passwordHash string) error
	UpdateProfile(ctx context.Context, user *User) error
	UpdateLastLoginAt(ctx context.Context, userID string, lastLoginAt time.Time) error
	AdminUpdate(ctx context.Context, userID string, update AdminUserUpdate) error
	UpdateStatus(ctx context.Context, userID, status string) error
	UpdateOrganization(ctx context.Context, userID string, orgID *string, orgName string) error
	Delete(ctx context.Context, userID string) error
	List(ctx context.Context, filter UserListFilter) ([]*User, int64, error)
	MoveAllByOrganization(ctx context.Context, fromOrgID string, toOrgID *string, toOrgName string) (int64, error)
}
