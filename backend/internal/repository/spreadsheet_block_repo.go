package repository

import (
	"context"
	"encoding/json"
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

type spreadsheetBlockRepo struct {
	db *gorm.DB
}

func NewSpreadsheetBlockRepository(db *gorm.DB) domain.SpreadsheetBlockRepository {
	return &spreadsheetBlockRepo{db: db}
}

func (r *spreadsheetBlockRepo) GetByDocumentAndBlock(ctx context.Context, documentID, blockID string) (*domain.SpreadsheetBlock, error) {
	var block domain.SpreadsheetBlock
	err := r.db.WithContext(ctx).
		Where("document_id = ? AND block_id = ?", documentID, blockID).
		First(&block).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if err := decodeSpreadsheetBlock(&block); err != nil {
		return nil, err
	}
	return &block, nil
}

func (r *spreadsheetBlockRepo) Save(ctx context.Context, block *domain.SpreadsheetBlock) error {
	if block == nil {
		return nil
	}
	if err := encodeSpreadsheetBlock(block); err != nil {
		return err
	}

	existing, err := r.GetByDocumentAndBlock(ctx, block.DocumentID, block.BlockID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return err
	}

	if existing == nil {
		return r.db.WithContext(ctx).Create(block).Error
	}

	block.ID = existing.ID
	return r.db.WithContext(ctx).Save(block).Error
}

func (r *spreadsheetBlockRepo) AppendRecord(ctx context.Context, documentID, blockID string, record domain.SpreadsheetRecord) (*domain.SpreadsheetBlock, error) {
	block, err := r.GetByDocumentAndBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}
	if record == nil {
		record = domain.SpreadsheetRecord{}
	}
	for _, meta := range block.Config.Meta {
		if _, ok := record[meta.Field]; !ok {
			record[meta.Field] = ""
		}
	}
	block.Records = append(block.Records, record)
	if err := r.Save(ctx, block); err != nil {
		return nil, err
	}
	return block, nil
}

func encodeSpreadsheetBlock(block *domain.SpreadsheetBlock) error {
	normalizeSpreadsheetBlock(block)

	configData, err := json.Marshal(block.Config)
	if err != nil {
		return err
	}
	recordsData, err := json.Marshal(block.Records)
	if err != nil {
		return err
	}
	filtersData, err := json.Marshal(block.Filters)
	if err != nil {
		return err
	}
	sortData, err := json.Marshal(block.Sort)
	if err != nil {
		return err
	}

	block.ConfigData = configData
	block.RecordsData = recordsData
	block.FiltersData = filtersData
	block.SortData = sortData
	return nil
}

func decodeSpreadsheetBlock(block *domain.SpreadsheetBlock) error {
	if len(block.ConfigData) > 0 {
		if err := json.Unmarshal(block.ConfigData, &block.Config); err != nil {
			return err
		}
	}
	if len(block.RecordsData) > 0 {
		if err := json.Unmarshal(block.RecordsData, &block.Records); err != nil {
			return err
		}
	}
	if len(block.FiltersData) > 0 {
		if err := json.Unmarshal(block.FiltersData, &block.Filters); err != nil {
			return err
		}
	}
	if len(block.SortData) > 0 {
		if err := json.Unmarshal(block.SortData, &block.Sort); err != nil {
			return err
		}
	}
	normalizeSpreadsheetBlock(block)
	return nil
}

func normalizeSpreadsheetBlock(block *domain.SpreadsheetBlock) {
	if block.Config.Rows == nil {
		block.Config.Rows = []string{}
	}
	if block.Config.Columns == nil {
		block.Config.Columns = []string{}
	}
	if block.Config.Values == nil {
		block.Config.Values = []string{}
	}
	if block.Config.Meta == nil {
		block.Config.Meta = []domain.SpreadsheetMetaField{}
	}
	if block.Records == nil {
		block.Records = []domain.SpreadsheetRecord{}
	}
	if block.Filters == nil {
		block.Filters = []domain.SpreadsheetFilter{}
	}
	if block.Sort.Order == "" {
		block.Sort.Order = "desc"
	}
	if block.Mode == "" {
		block.Mode = domain.SpreadsheetModePivot
	}
	if block.Title == "" {
		block.Title = "多维表格"
	}
}
