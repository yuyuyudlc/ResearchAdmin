package database

import (
	"research/internal/domain"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func Open(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&domain.User{}); err != nil {
		return nil, err
	}
	return db, nil
}
