package router

import (
	_ "research/docs"
	"research/internal/auth"
	"research/internal/handler"
	"research/internal/middleware"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func New(authHandler *handler.AuthHandler, tokenManager *auth.TokenManager) *gin.Engine {
	r := gin.Default()

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	authGroup := r.Group("/api/v1/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/register", authHandler.Register)

	protectedAuthGroup := authGroup.Group("")
	protectedAuthGroup.Use(middleware.JWTAuth(tokenManager))
	protectedAuthGroup.PUT("/password", authHandler.ChangePassword)
	protectedAuthGroup.PUT("/profile", authHandler.UpdateProfile)

	return r
}
