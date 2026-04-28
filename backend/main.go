package main

import (
	"log"

	"research/internal/auth"
	"research/internal/config"
	"research/internal/database"
	"research/internal/handler"
	"research/internal/repository"
	"research/internal/router"
	"research/internal/service"
)

// @title Research Admin Backend API
// @version 1.0
// @description 科研项目文档管理系统后端 API。
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description 输入 Bearer Token，格式：Bearer {token}
func main() {
	cfg := config.Load()

	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	tokenManager := auth.NewTokenManager(cfg.JWT.Secret, cfg.JWT.TTL)
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, tokenManager)
	documentService := service.NewDocumentService(db)
	authHandler := handler.NewAuthHandler(authService)
	documentHandler := handler.NewDocumentHandler(documentService)
	r := router.New(authHandler, documentHandler, tokenManager)

	log.Printf("Server starting on %s...", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
