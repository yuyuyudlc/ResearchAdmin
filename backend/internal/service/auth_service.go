// internal/service/auth_service.go
package service

import (
	"context"
	"errors"
	"time"
	"research/internal/domain"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// 定义签名密钥
var jwtSecret = []byte("super_secret_key_mamba_out")

type AuthService struct {
	repo domain.UserRepository
}

func NewAuthService(repo domain.UserRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Login 执行登录核心逻辑
func (s *AuthService) Login(ctx context.Context, username, password string) (string, error) {
	// 1. 查数据库
	user, err := s.repo.GetByUsername(ctx, username)
	if err != nil {
		return "", err
	}

	// 2. 校验哈希密码
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", errors.New("密码错误")
	}

	// 3. 生成 JWT
	claims := domain.CustomClaims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}