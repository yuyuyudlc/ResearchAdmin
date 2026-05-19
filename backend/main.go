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
	organizationRepo := repository.NewOrganizationRepository(db)
	workspaceRepo := repository.NewWorkspaceRepository(db)
	workspaceMemberRepo := repository.NewWorkspaceMemberRepository(db)
	documentRepo := repository.NewDocumentRepository(db)
	docACLRepo := repository.NewDocACLRepository(db)
	bodyRepo := repository.NewDocumentBodyRepository(db)
	documentService := service.NewDocumentService(workspaceRepo, workspaceMemberRepo, documentRepo, docACLRepo, userRepo, bodyRepo)
	authService := service.NewAuthService(userRepo, tokenManager, documentService)
	adminOrgService := service.NewAdminOrganizationService(organizationRepo, userRepo)
	adminUserService := service.NewAdminUserService(userRepo, organizationRepo, authService)
	authHandler := handler.NewAuthHandler(authService)
	documentHandler := handler.NewDocumentHandler(documentService)
	adminUserHandler := handler.NewAdminUserHandler(adminUserService)
	adminOrgHandler := handler.NewAdminOrganizationHandler(adminOrgService)
	r := router.New(authHandler, documentHandler, adminUserHandler, adminOrgHandler, tokenManager)

	log.Printf("Server starting on %s...", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
