package database

import (
	"testing"

	"research/internal/domain"
)

func TestOpenAutoMigratesUUIDTables(t *testing.T) {
	db, err := Open("file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}

	models := []any{
		&domain.User{},
		&domain.Workspace{},
		&domain.WorkspaceMember{},
		&domain.Document{},
		&domain.DocACL{},
	}

	for _, model := range models {
		if !db.Migrator().HasTable(model) {
			t.Fatalf("expected table for %T to exist", model)
		}
	}

	user := domain.User{
		Username:     "alice",
		Email:        "alice@example.com",
		DisplayName:  "alice",
		Status:       "active",
		PasswordHash: "password-hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Create(User) error = %v", err)
	}
	if len(user.ID) != 36 {
		t.Fatalf("expected UUID user ID, got %q", user.ID)
	}
}
