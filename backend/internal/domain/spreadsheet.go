package domain

import (
	"time"

	"gorm.io/gorm"
)

type SpreadsheetMode string

const (
	SpreadsheetModePivot SpreadsheetMode = "pivot"
	SpreadsheetModeTable SpreadsheetMode = "table"
)

type SpreadsheetMetaField struct {
	Field     string `json:"field"`
	Name      string `json:"name"`
	Type      string `json:"type,omitempty"`
	Formatter string `json:"formatter,omitempty"`
}

type SpreadsheetConfig struct {
	Rows    []string               `json:"rows"`
	Columns []string               `json:"columns"`
	Values  []string               `json:"values"`
	Meta    []SpreadsheetMetaField `json:"meta"`
}

type SpreadsheetRecord map[string]any

type SpreadsheetFilter struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
}

type SpreadsheetSort struct {
	Field *string `json:"field"`
	Order string  `json:"order"`
}

type SpreadsheetBlock struct {
	ID           string              `gorm:"type:char(36);primaryKey" json:"id"`
	DocumentID   string              `gorm:"type:char(36);not null;uniqueIndex:idx_spreadsheet_blocks_document_block,priority:1" json:"documentId"`
	BlockID      string              `gorm:"size:128;not null;uniqueIndex:idx_spreadsheet_blocks_document_block,priority:2" json:"blockId"`
	Title        string              `gorm:"size:255;not null" json:"title"`
	Mode         SpreadsheetMode     `gorm:"size:16;not null" json:"mode"`
	ConfigData   []byte              `gorm:"type:blob;not null" json:"-"`
	RecordsData  []byte              `gorm:"type:blob;not null" json:"-"`
	FiltersData  []byte              `gorm:"type:blob;not null" json:"-"`
	SortData     []byte              `gorm:"type:blob;not null" json:"-"`
	SnapshotData []byte              `gorm:"type:blob" json:"-"`
	ActiveMetric *string             `gorm:"size:255" json:"activeMetric"`
	Config       SpreadsheetConfig   `gorm:"-" json:"config"`
	Records      []SpreadsheetRecord `gorm:"-" json:"records"`
	Filters      []SpreadsheetFilter `gorm:"-" json:"filters"`
	Sort         SpreadsheetSort     `gorm:"-" json:"sort"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `json:"updatedAt"`
}

func (SpreadsheetBlock) TableName() string {
	return "spreadsheet_blocks"
}

func (b *SpreadsheetBlock) BeforeCreate(tx *gorm.DB) error {
	assignUUID(&b.ID)
	return nil
}
