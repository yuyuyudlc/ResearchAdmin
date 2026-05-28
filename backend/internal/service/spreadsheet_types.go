package service

import "research/internal/domain"

type UpdateSpreadsheetBlockRequest struct {
	Title        *string
	Mode         *domain.SpreadsheetMode
	Config       *domain.SpreadsheetConfig
	Filters      []domain.SpreadsheetFilter
	Sort         *domain.SpreadsheetSort
	ActiveMetric *string
	ClearMetric  bool
}

type UpdateSpreadsheetCellRequest struct {
	RowIndex int
	Field    string
	Value    any
}

type CreateSpreadsheetRecordRequest struct {
	Record domain.SpreadsheetRecord
}

type SpreadsheetExportResponse struct {
	Filename string                     `json:"filename"`
	Rows     []domain.SpreadsheetRecord `json:"rows"`
	Columns  []string                   `json:"columns"`
}
