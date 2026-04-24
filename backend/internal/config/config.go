package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	HTTPAddr string
	DBDSN    string
	JWT      JWTConfig
}

type JWTConfig struct {
	Secret string
	TTL    time.Duration
}

func Load() Config {
	loadDotEnv(".env")
	loadDotEnv("../.env")

	return Config{
		HTTPAddr: getEnv("HTTP_ADDR", ":8080"),
		DBDSN:    getEnv("DB_DSN", "test.db"),
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "dev_secret_change_me"),
			TTL:    getDurationEnv("JWT_TTL_SECONDS", 24*time.Hour),
		},
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

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		_ = os.Setenv(key, value)
	}
}
