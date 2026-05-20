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

func New(
	authHandler *handler.AuthHandler,
	documentHandler *handler.DocumentHandler,
	adminUserHandler *handler.AdminUserHandler,
	adminOrgHandler *handler.AdminOrganizationHandler,
	tokenManager *auth.TokenManager,
) *gin.Engine {
	r := gin.Default()

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	authGroup := r.Group("/api/v1/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/register", authHandler.Register)

	protectedAuthGroup := authGroup.Group("")
	protectedAuthGroup.Use(middleware.JWTAuth(tokenManager))
	protectedAuthGroup.PUT("/password", authHandler.ChangePassword)
	protectedAuthGroup.PUT("/profile", authHandler.UpdateProfile)

	api := r.Group("/api/v1")
	api.Use(middleware.JWTAuth(tokenManager))
	api.GET("/users/search", authHandler.SearchUsers)
	api.POST("/workspaces", documentHandler.CreateWorkspace)
	api.GET("/workspaces", documentHandler.ListWorkspaces)
	api.GET("/workspaces/:workspaceId", documentHandler.GetWorkspaceDirectory)
	api.PATCH("/workspaces/:workspaceId", documentHandler.UpdateWorkspace)
	api.DELETE("/workspaces/:workspaceId", documentHandler.DeleteWorkspace)
	api.GET("/workspaces/:workspaceId/members", documentHandler.ListMembers)
	api.POST("/workspaces/:workspaceId/members", documentHandler.AddMember)
	api.PATCH("/workspaces/:workspaceId/members/:userId", documentHandler.UpdateMember)
	api.DELETE("/workspaces/:workspaceId/members/:userId", documentHandler.RemoveMember)
	api.POST("/workspaces/:workspaceId/documents", documentHandler.CreateDocument)
	api.POST("/workspaces/:workspaceId/documents/upload", documentHandler.UploadDocument)

	api.GET("/documents/:documentId", documentHandler.GetDocument)
	api.PATCH("/documents/:documentId", documentHandler.UpdateDocument)
	api.POST("/documents/:documentId/move", documentHandler.MoveDocument)
	api.POST("/documents/:documentId/archive", documentHandler.ArchiveDocument)
	api.POST("/documents/:documentId/restore", documentHandler.RestoreDocument)
	api.DELETE("/documents/:documentId", documentHandler.DeleteDocument)
	api.GET("/documents/:documentId/download", documentHandler.DownloadDocument)
	api.GET("/documents/:documentId/acl", documentHandler.ListACL)
	api.POST("/documents/:documentId/acl", documentHandler.CreateACL)
	api.PATCH("/documents/:documentId/acl/:aclId", documentHandler.UpdateACL)
	api.DELETE("/documents/:documentId/acl/:aclId", documentHandler.DeleteACL)
	api.GET("/documents/:documentId/my-permission", documentHandler.MyPermission)
	api.GET("/documents/:documentId/body", documentHandler.GetBody)
	api.PUT("/documents/:documentId/body", documentHandler.PutBody)

	// 管理员后台：需 JWT + AdminOnly
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AdminOnly())

	// 机构
	adminGroup.GET("/organizations", adminOrgHandler.ListOrganizations)
	adminGroup.POST("/organizations", adminOrgHandler.CreateOrganization)
	adminGroup.PATCH("/organizations/:orgId", adminOrgHandler.UpdateOrganization)
	adminGroup.DELETE("/organizations/:orgId", adminOrgHandler.DeleteOrganization)
	adminGroup.POST("/organizations/:orgId/move-users", adminOrgHandler.MoveAllUsers)

	// 用户
	adminGroup.GET("/users", adminUserHandler.ListUsers)
	adminGroup.POST("/users", adminUserHandler.CreateUser)
	adminGroup.GET("/users/:userId", adminUserHandler.GetUser)
	adminGroup.PATCH("/users/:userId", adminUserHandler.UpdateUser)
	adminGroup.DELETE("/users/:userId", adminUserHandler.DeleteUser)
	adminGroup.POST("/users/:userId/move", adminUserHandler.MoveUser)
	adminGroup.POST("/users/:userId/reset-password", adminUserHandler.ResetPassword)
	adminGroup.POST("/users/:userId/status", adminUserHandler.SetStatus)

	return r
}
