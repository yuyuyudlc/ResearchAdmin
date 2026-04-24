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

func main() {
	cfg := config.Load()

	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	tokenManager := auth.NewTokenManager(cfg.JWT.Secret, cfg.JWT.TTL)
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, tokenManager)
	authHandler := handler.NewAuthHandler(authService)
	r := router.New(authHandler, tokenManager)

	log.Printf("Server starting on %s...", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
