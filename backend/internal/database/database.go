package database

import (
	"strings"

	"research/internal/domain"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func Open(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Organization{},
		&domain.Workspace{},
		&domain.WorkspaceMember{},
		&domain.Document{},
		&domain.DocACL{},
		&domain.DocumentBody{},
		&domain.SpreadsheetBlock{},
		&domain.DocumentAccess{},
		&domain.DocumentFavorite{},
	); err != nil {
		return nil, err
	}
	if err := backfillOrganizations(db); err != nil {
		return nil, err
	}
	return db, nil
}

// backfillOrganizations 将历史 users.organization 字符串迁移为 organizations 实体。
// 幂等：每次启动均会跑，但只对未关联 organization_id 的用户起作用。
func backfillOrganizations(db *gorm.DB) error {
	// 1) 取出所有 organization_id 为 NULL、且 organization 非空的用户的 organization 列。
	var names []string
	err := db.Model(&domain.User{}).
		Where("organization_id IS NULL AND organization <> ''").
		Distinct("organization").
		Pluck("organization", &names).Error
	if err != nil {
		return err
	}

	// 2) 为每个不存在的机构名创建一条 organization 记录。
	for _, raw := range names {
		name := strings.TrimSpace(raw)
		if name == "" {
			continue
		}
		var existing domain.Organization
		err := db.Where("name = ?", name).First(&existing).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}
		if err == gorm.ErrRecordNotFound {
			created := &domain.Organization{Name: name}
			if err := db.Create(created).Error; err != nil {
				return err
			}
			existing = *created
		}

		// 3) 回填该机构的所有未关联用户的 organization_id。
		if err := db.Model(&domain.User{}).
			Where("organization_id IS NULL AND organization = ?", name).
			Update("organization_id", existing.ID).Error; err != nil {
			return err
		}
	}

	// 4) organization 字段为空的用户保持 organization_id = NULL（未分配）。
	// 同时把空白字符串规范成空串，避免出现 "  " 误判。
	if err := db.Model(&domain.User{}).
		Where("organization IS NULL").
		Update("organization", "").Error; err != nil {
		return err
	}

	return nil
}
