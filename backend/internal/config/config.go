package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPAddr string
	DBDSN    string
	JWT      JWTConfig
	InternalToken string
}

type JWTConfig struct {
	Secret string
	TTL    time.Duration
}

func Load() Config {
	_ = godotenv.Load(".env", "../.env")

	return Config{
		HTTPAddr: getEnv("HTTP_ADDR", ":8080"),
		DBDSN:    getEnv("DB_DSN", "test.db"),
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "dev_secret_change_me"),
			TTL:    getDurationEnv("JWT_TTL_SECONDS", 24*time.Hour),
		},
		InternalToken: getEnv("GO_INTERNAL_TOKEN", ""),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}
