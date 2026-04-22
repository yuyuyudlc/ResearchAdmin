package main

import (
	"log"
	"research/internal/domain"
	"research/internal/handler"
	"research/internal/repository"
	"research/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 1. 初始化 SQLite (GORM)
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// 自动迁移表结构
	db.AutoMigrate(&domain.User{})

	// 2. 依赖装配 (核心逻辑)
	// 将 db 注入给 Repo -> 将 Repo 注入给 Service -> 将 Service 注入给 Handler
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	authHandler := handler.NewAuthHandler(authService)

	// 3. 注册 Gin 路由
	r := gin.Default()
	r.POST("/login", authHandler.Login)

	// 4. 启动服务
	log.Println("Server starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}