package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"research/internal/domain"
)

// DefaultInitialPassword 管理员下发账号或重置密码使用的默认初始密码。
const DefaultInitialPassword = "Research@123"

// AdminCreateUserRequest 管理员创建账号入参。
type AdminCreateUserRequest struct {
	Username          string
	Email             string
	OrganizationID    *string // nil = 未分配
	ProfessionalTitle domain.ProfessionalTitle
	Supervisor        string
}

// AdminUpdateUserRequest 管理员修改用户基础信息（不含机构与密码）
type AdminUpdateUserRequest struct {
	Username          *string
	Email             *string
	ProfessionalTitle *domain.ProfessionalTitle
	Supervisor        *string
	Signature         *string
	AvatarURL         *string
}

// AdminCreateUserResult 创建账号结果，包含初始密码（仅在创建/重置时返回明文）。
type AdminCreateUserResult struct {
	User            UserResponse `json:"user"`
	InitialPassword string       `json:"initialPassword"`
}

// AdminListUsersRequest 管理员侧用户列表筛选
type AdminListUsersRequest struct {
	OrganizationID    *string
	IncludeUnassigned bool
	Q                 string
	Page              int
	PageSize          int
}

// AdminListUsersResult 用户列表分页
type AdminListUsersResult struct {
	Items    []UserResponse `json:"items"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"pageSize"`
}

// AdminUserService 管理员用户管理
type AdminUserService struct {
	userRepo    domain.UserRepository
	orgRepo     domain.OrganizationRepository
	authService *AuthService
}

func NewAdminUserService(
	userRepo domain.UserRepository,
	orgRepo domain.OrganizationRepository,
	authService *AuthService,
) *AdminUserService {
	return &AdminUserService{userRepo: userRepo, orgRepo: orgRepo, authService: authService}
}

// ListUsers 列表
func (s *AdminUserService) ListUsers(ctx context.Context, req AdminListUsersRequest) (*AdminListUsersResult, error) {
	filter := domain.UserListFilter{
		OrganizationID:    req.OrganizationID,
		IncludeUnassigned: req.IncludeUnassigned,
		Q:                 req.Q,
		Page:              req.Page,
		PageSize:          req.PageSize,
	}
	users, total, err := s.userRepo.List(ctx, filter)
	if err != nil {
		return nil, err
	}
	items := make([]UserResponse, 0, len(users))
	for _, u := range users {
		items = append(items, toUserResponse(u))
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	return &AdminListUsersResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetUser 详情
func (s *AdminUserService) GetUser(ctx context.Context, userID string) (*UserResponse, error) {
	u, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	resp := toUserResponse(u)
	return &resp, nil
}

// CreateUser 创建账号（默认初始密码）
func (s *AdminUserService) CreateUser(ctx context.Context, req AdminCreateUserRequest) (*AdminCreateUserResult, error) {
	username := strings.TrimSpace(req.Username)
	email := strings.TrimSpace(req.Email)
	if username == "" || email == "" {
		return nil, fmt.Errorf("%w: 用户名和邮箱不能为空", ErrInvalidArgument)
	}

	// 校验机构存在性
	var orgName string
	if req.OrganizationID != nil {
		org, err := s.orgRepo.GetByID(ctx, *req.OrganizationID)
		if err != nil {
			return nil, err
		}
		orgName = org.Name
	}

	registerReq := RegisterRequest{
		Username:          username,
		Email:             email,
		Password:          DefaultInitialPassword,
		Organization:      orgName,
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        strings.TrimSpace(req.Supervisor),
	}
	if err := s.authService.Register(ctx, registerReq); err != nil {
		msg := err.Error()
		switch msg {
		case "邮箱已存在":
			return nil, fmt.Errorf("%w: %s", ErrConflict, msg)
		case "用户名、邮箱和密码不能为空", "密码长度不能少于6位":
			return nil, fmt.Errorf("%w: %s", ErrInvalidArgument, msg)
		default:
			return nil, err
		}
	}

	// 再次取出并补 organization_id 关联
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if req.OrganizationID != nil {
		if err := s.userRepo.UpdateOrganization(ctx, user.ID, req.OrganizationID, orgName); err != nil {
			return nil, err
		}
		user.OrganizationID = req.OrganizationID
		user.Organization = orgName
	}

	return &AdminCreateUserResult{
		User:            toUserResponse(user),
		InitialPassword: DefaultInitialPassword,
	}, nil
}

// UpdateUser 修改基础信息（不含机构、密码、状态）
func (s *AdminUserService) UpdateUser(ctx context.Context, userID string, req AdminUpdateUserRequest) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	update := domain.AdminUserUpdate{
		Username:          user.Username,
		Email:             user.Email,
		AvatarURL:         user.AvatarURL,
		Signature:         user.Signature,
		ProfessionalTitle: user.ProfessionalTitle,
		Supervisor:        user.Supervisor,
		DisplayName:       user.DisplayName,
	}

	if req.Username != nil {
		username := strings.TrimSpace(*req.Username)
		if username == "" {
			return nil, fmt.Errorf("%w: 用户名不能为空", ErrInvalidArgument)
		}
		update.Username = username
		update.DisplayName = username
	}
	if req.Email != nil {
		email := strings.TrimSpace(*req.Email)
		if email == "" {
			return nil, fmt.Errorf("%w: 邮箱不能为空", ErrInvalidArgument)
		}
		if email != user.Email {
			if dup, err := s.userRepo.GetByEmail(ctx, email); err != nil && !errors.Is(err, domain.ErrUserNotFound) {
				return nil, err
			} else if dup != nil && dup.ID != user.ID {
				return nil, fmt.Errorf("%w: 邮箱已存在", ErrConflict)
			}
		}
		update.Email = email
	}
	if req.ProfessionalTitle != nil {
		update.ProfessionalTitle = *req.ProfessionalTitle
	}
	if req.Supervisor != nil {
		update.Supervisor = strings.TrimSpace(*req.Supervisor)
	}
	if req.Signature != nil {
		update.Signature = strings.TrimSpace(*req.Signature)
	}
	if req.AvatarURL != nil {
		update.AvatarURL = strings.TrimSpace(*req.AvatarURL)
	}

	if err := s.userRepo.AdminUpdate(ctx, user.ID, update); err != nil {
		return nil, err
	}
	// 取最新数据回包
	fresh, err := s.userRepo.GetByID(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	resp := toUserResponse(fresh)
	return &resp, nil
}

// MoveUser 单人移动机构。orgID == nil 表示未分配。
func (s *AdminUserService) MoveUser(ctx context.Context, userID string, orgID *string) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	var orgName string
	if orgID != nil {
		org, err := s.orgRepo.GetByID(ctx, *orgID)
		if err != nil {
			return nil, err
		}
		orgName = org.Name
	}
	if err := s.userRepo.UpdateOrganization(ctx, user.ID, orgID, orgName); err != nil {
		return nil, err
	}
	fresh, err := s.userRepo.GetByID(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	resp := toUserResponse(fresh)
	return &resp, nil
}

// ResetPassword 重置为默认初始密码
func (s *AdminUserService) ResetPassword(ctx context.Context, userID string) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}
	hash, err := hashPassword(DefaultInitialPassword)
	if err != nil {
		return "", err
	}
	if err := s.userRepo.UpdatePasswordHash(ctx, user.ID, hash); err != nil {
		return "", err
	}
	return DefaultInitialPassword, nil
}

// SetStatus 启用/禁用
func (s *AdminUserService) SetStatus(ctx context.Context, userID, status string, currentUserID string) error {
	if status != domain.UserStatusActive && status != domain.UserStatusDisabled {
		return fmt.Errorf("%w: 无效的状态值", ErrInvalidArgument)
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.Username == "admin" {
		return fmt.Errorf("%w: 不能禁用 admin 账号", ErrForbidden)
	}
	if user.ID == currentUserID {
		return fmt.Errorf("%w: 不能禁用自己", ErrForbidden)
	}
	return s.userRepo.UpdateStatus(ctx, user.ID, status)
}

// DeleteUser 删除用户
func (s *AdminUserService) DeleteUser(ctx context.Context, userID, currentUserID string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.Username == "admin" {
		return fmt.Errorf("%w: 不能删除 admin 账号", ErrForbidden)
	}
	if user.ID == currentUserID {
		return fmt.Errorf("%w: 不能删除自己", ErrForbidden)
	}
	return s.userRepo.Delete(ctx, user.ID)
}