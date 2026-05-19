// internal/service/auth_service.go
package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"research/internal/auth"
	"research/internal/domain"

	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username          string
	Email             string
	Password          string
	Organization      string
	AvatarURL         string
	Signature         string
	ProfessionalTitle domain.ProfessionalTitle
	Supervisor        string
}

type ChangePasswordRequest struct {
	UserID      string
	OldPassword string
	NewPassword string
}

type UpdateProfileRequest struct {
	UserID            string
	Username          string
	Email             string
	Organization      string
	AvatarURL         string
	Signature         string
	ProfessionalTitle domain.ProfessionalTitle
	Supervisor        string
}

type WorkspaceCreator interface {
	CreatePrivateWorkspace(ctx context.Context, userID string) error
}

type AuthService struct {
	repo             domain.UserRepository
	tokenManager     *auth.TokenManager
	workspaceCreator WorkspaceCreator
}

type LoginResult struct {
	AccessToken string       `json:"accessToken"`
	ExpiresIn   int64        `json:"expiresIn"`
	User        UserResponse `json:"user"`
}

type UserResponse struct {
	ID                string                   `json:"id"`
	Username          string                   `json:"username"`
	Email             string                   `json:"email"`
	OrganizationID    *string                  `json:"organizationId"`
	Organization      string                   `json:"organization"`
	AvatarURL         string                   `json:"avatarUrl"`
	Signature         string                   `json:"signature"`
	ProfessionalTitle domain.ProfessionalTitle `json:"professionalTitle"`
	Supervisor        string                   `json:"supervisor"`
	DisplayName       string                   `json:"displayName"`
	Status            string                   `json:"status"`
}

func NewAuthService(repo domain.UserRepository, tokenManager *auth.TokenManager, workspaceCreator WorkspaceCreator) *AuthService {
	return &AuthService{
		repo:             repo,
		tokenManager:     tokenManager,
		workspaceCreator: workspaceCreator,
	}
}

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) error {
	username := strings.TrimSpace(req.Username)
	email := strings.TrimSpace(req.Email)
	password := strings.TrimSpace(req.Password)
	if username == "" || email == "" || password == "" {
		return errors.New("用户名、邮箱和密码不能为空")
	}
	if len(password) < 6 {
		return errors.New("密码长度不能少于6位")
	}

	if err := s.ensureEmailAvailable(ctx, email, ""); err != nil {
		return err
	}

	passwordHash, err := hashPassword(password)
	if err != nil {
		return err
	}

	user := &domain.User{
		Username:          username,
		Email:             email,
		Organization:      strings.TrimSpace(req.Organization),
		AvatarURL:         strings.TrimSpace(req.AvatarURL),
		Signature:         strings.TrimSpace(req.Signature),
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        strings.TrimSpace(req.Supervisor),
		DisplayName:       username,
		Status:            "active",
		PasswordHash:      passwordHash,
	}
	if err := s.repo.Create(ctx, user); err != nil {
		return err
	}
	return s.workspaceCreator.CreatePrivateWorkspace(ctx, user.ID)
}

func (s *AuthService) ChangePassword(ctx context.Context, req ChangePasswordRequest) error {
	oldPassword := strings.TrimSpace(req.OldPassword)
	newPassword := strings.TrimSpace(req.NewPassword)
	if req.UserID == "" || oldPassword == "" || newPassword == "" {
		return errors.New("用户ID、旧密码和新密码不能为空")
	}
	if len(newPassword) < 6 {
		return errors.New("新密码长度不能少于6位")
	}

	user, err := s.repo.GetByID(ctx, req.UserID)
	if err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("旧密码错误")
	}

	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.repo.UpdatePasswordHash(ctx, user.ID, passwordHash)
}

func (s *AuthService) UpdateProfile(ctx context.Context, req UpdateProfileRequest) error {
	username := strings.TrimSpace(req.Username)
	email := strings.TrimSpace(req.Email)
	if req.UserID == "" || username == "" || email == "" {
		return errors.New("用户ID、用户名和邮箱不能为空")
	}

	user, err := s.repo.GetByID(ctx, req.UserID)
	if err != nil {
		return err
	}
	if err := s.ensureEmailAvailable(ctx, email, user.ID); err != nil {
		return err
	}

	user.Username = username
	user.Email = email
	user.Organization = strings.TrimSpace(req.Organization)
	user.AvatarURL = strings.TrimSpace(req.AvatarURL)
	user.Signature = strings.TrimSpace(req.Signature)
	user.ProfessionalTitle = req.ProfessionalTitle
	user.Supervisor = strings.TrimSpace(req.Supervisor)
	user.DisplayName = username

	return s.repo.UpdateProfile(ctx, user)
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	user, err := s.repo.GetByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		return nil, err
	}

	if user.Status == domain.UserStatusDisabled {
		return nil, errors.New("账号已被禁用，请联系管理员")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("密码错误")
	}

	token, err := s.tokenManager.Sign(user)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if err := s.repo.UpdateLastLoginAt(ctx, user.ID, now); err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		ExpiresIn:   int64(s.tokenManager.TTL().Seconds()),
		User:        toUserResponse(user),
	}, nil
}

func (s *AuthService) ensureEmailAvailable(ctx context.Context, email string, currentUserID string) error {
	existingUser, err := s.repo.GetByEmail(ctx, email)
	if errors.Is(err, domain.ErrUserNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if existingUser.ID != currentUserID {
		return errors.New("邮箱已存在")
	}
	return nil
}

func hashPassword(password string) (string, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(passwordHash), nil
}

func toUserResponse(user *domain.User) UserResponse {
	displayName := user.DisplayName
	if displayName == "" {
		displayName = user.Username
	}
	return UserResponse{
		ID:                user.ID,
		Username:          user.Username,
		Email:             user.Email,
		OrganizationID:    user.OrganizationID,
		Organization:      user.Organization,
		AvatarURL:         user.AvatarURL,
		Signature:         user.Signature,
		ProfessionalTitle: user.ProfessionalTitle,
		Supervisor:        user.Supervisor,
		DisplayName:       displayName,
		Status:            user.Status,
	}
}
