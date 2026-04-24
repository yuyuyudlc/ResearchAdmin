package router

import (
	"research/internal/auth"
	"research/internal/handler"
	"research/internal/middleware"

	"github.com/gin-gonic/gin"
)

func New(authHandler *handler.AuthHandler, tokenManager *auth.TokenManager) *gin.Engine {
	r := gin.Default()

	authGroup := r.Group("/api/v1/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/register", authHandler.Register)

	protectedAuthGroup := authGroup.Group("")
	protectedAuthGroup.Use(middleware.JWTAuth(tokenManager))
	protectedAuthGroup.PUT("/password", authHandler.ChangePassword)
	protectedAuthGroup.PUT("/profile", authHandler.UpdateProfile)

	return r
}
