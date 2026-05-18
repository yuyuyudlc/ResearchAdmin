package auth

import (
	"errors"
	"time"

	"research/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID            string                   `json:"user_id"`
	Username          string                   `json:"username"`
	Email             string                   `json:"email"`
	Organization      string                   `json:"organization"`
	AvatarURL         string                   `json:"avatar_url"`
	Signature         string                   `json:"signature"`
	ProfessionalTitle domain.ProfessionalTitle `json:"professional_title"`
	Supervisor        string                   `json:"supervisor"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{
		secret: []byte(secret),
		ttl:    ttl,
	}
}

func (m *TokenManager) TTL() time.Duration {
	return m.ttl
}

func (m *TokenManager) Sign(user *domain.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:            user.ID,
		Username:          user.Username,
		Email:             user.Email,
		Organization:      user.Organization,
		AvatarURL:         user.AvatarURL,
		Signature:         user.Signature,
		ProfessionalTitle: user.ProfessionalTitle,
		Supervisor:        user.Supervisor,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *TokenManager) Parse(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("不支持的 token 签名方法")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("无效 token")
	}
	return claims, nil
}
