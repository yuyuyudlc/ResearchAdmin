package domain

import (
	"context"
	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID			uint `gorm:"primaryKey"`
	Username	string `gorm:"unique;not null"`
	PasswordHash string `gorm:"not null"`
}

// CustomClaims JWT 载荷
type CustomClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// UserRepository 接口：隔离数据库实现
type UserRepository interface {
	GetByUsername(ctx context.Context, username string) (*User, error)
}