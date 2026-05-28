package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"research/internal/domain"
)

func (s *DocumentService) GetSpreadsheetBlock(ctx context.Context, userID, documentID, blockID string) (*domain.SpreadsheetBlock, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return nil, err
	}
	return s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
}

func (s *DocumentService) UpdateSpreadsheetBlock(ctx context.Context, userID, documentID, blockID string, req UpdateSpreadsheetBlockRequest) (*domain.SpreadsheetBlock, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionEdit); err != nil {
		return nil, err
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		block.Title = strings.TrimSpace(*req.Title)
	}
	if req.Mode != nil {
		block.Mode = *req.Mode
	}
	if req.Config != nil {
		block.Config = cloneSpreadsheetConfig(*req.Config)
	}
	if req.Filters != nil {
		block.Filters = cloneSpreadsheetFilters(req.Filters)
	}
	if req.Sort != nil {
		block.Sort = cloneSpreadsheetSort(*req.Sort)
	}
	if req.ClearMetric {
		block.ActiveMetric = nil
	} else if req.ActiveMetric != nil {
		metric := strings.TrimSpace(*req.ActiveMetric)
		if metric == "" {
			block.ActiveMetric = nil
		} else {
			block.ActiveMetric = &metric
		}
	}

	if err := s.spreadsheetRepo.Save(ctx, block); err != nil {
		return nil, err
	}
	return block, nil
}

func (s *DocumentService) UpdateSpreadsheetCell(ctx context.Context, userID, documentID, blockID string, req UpdateSpreadsheetCellRequest) (*domain.SpreadsheetBlock, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionEdit); err != nil {
		return nil, err
	}
	if req.RowIndex < 0 {
		return nil, fmt.Errorf("%w: rowIndex 不能为负数", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.Field) == "" {
		return nil, fmt.Errorf("%w: field 不能为空", ErrInvalidArgument)
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}
	if req.RowIndex >= len(block.Records) {
		return nil, fmt.Errorf("%w: 行索引超出范围", ErrInvalidArgument)
	}
	if block.Records[req.RowIndex] == nil {
		block.Records[req.RowIndex] = domain.SpreadsheetRecord{}
	}
	block.Records[req.RowIndex][req.Field] = req.Value

	if err := s.spreadsheetRepo.Save(ctx, block); err != nil {
		return nil, err
	}
	return block, nil
}

func (s *DocumentService) CreateSpreadsheetRecord(ctx context.Context, userID, documentID, blockID string, req CreateSpreadsheetRecordRequest) (*domain.SpreadsheetBlock, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionEdit); err != nil {
		return nil, err
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}

	record := domain.SpreadsheetRecord{}
	for _, meta := range block.Config.Meta {
		if value, ok := req.Record[meta.Field]; ok {
			record[meta.Field] = value
			continue
		}
		record[meta.Field] = ""
	}
	for field, value := range req.Record {
		if _, ok := record[field]; !ok {
			record[field] = value
		}
	}

	updated, err := s.spreadsheetRepo.AppendRecord(ctx, documentID, blockID, record)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *DocumentService) GetSpreadsheetBody(ctx context.Context, userID, documentID, blockID string) ([]byte, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return nil, err
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}
	if len(block.SnapshotData) == 0 {
		return []byte{}, nil
	}
	return append([]byte(nil), block.SnapshotData...), nil
}

func (s *DocumentService) PutSpreadsheetBody(ctx context.Context, userID, documentID, blockID string, data []byte) error {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionEdit); err != nil {
		return err
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return err
	}
	block.SnapshotData = append([]byte(nil), data...)
	return s.spreadsheetRepo.Save(ctx, block)
}

func (s *DocumentService) ExportSpreadsheetBlock(ctx context.Context, userID, documentID, blockID string) (*SpreadsheetExportResponse, error) {
	doc, err := s.getDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	if err := s.requireDocumentPermission(ctx, userID, doc, domain.PermissionRead); err != nil {
		return nil, err
	}

	block, err := s.loadOrCreateSpreadsheetBlock(ctx, documentID, blockID)
	if err != nil {
		return nil, err
	}

	filteredRecords := applySpreadsheetSort(applySpreadsheetFilters(block.Records, block.Filters), block.Sort)
	filename := sanitizeSpreadsheetFilename(block.Title, block.Mode)
	rows, columns := buildSpreadsheetExport(block, filteredRecords)

	return &SpreadsheetExportResponse{
		Filename: filename,
		Rows:     rows,
		Columns:  columns,
	}, nil
}

func (s *DocumentService) loadOrCreateSpreadsheetBlock(ctx context.Context, documentID, blockID string) (*domain.SpreadsheetBlock, error) {
	block, err := s.spreadsheetRepo.GetByDocumentAndBlock(ctx, documentID, blockID)
	if err == nil {
		return block, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	block = defaultSpreadsheetBlock(documentID, blockID)
	if err := s.spreadsheetRepo.Save(ctx, block); err != nil {
		return nil, err
	}
	return block, nil
}

func defaultSpreadsheetBlock(documentID, blockID string) *domain.SpreadsheetBlock {
	return &domain.SpreadsheetBlock{
		DocumentID: documentID,
		BlockID:    blockID,
		Title:      "多维表格",
		Mode:       domain.SpreadsheetModePivot,
		Config: domain.SpreadsheetConfig{
			Rows:    []string{},
			Columns: []string{},
			Values:  []string{},
			Meta:    []domain.SpreadsheetMetaField{},
		},
		Records: []domain.SpreadsheetRecord{},
		Filters: []domain.SpreadsheetFilter{},
		Sort: domain.SpreadsheetSort{
			Field: nil,
			Order: "desc",
		},
	}
}

func cloneSpreadsheetConfig(config domain.SpreadsheetConfig) domain.SpreadsheetConfig {
	cloned := domain.SpreadsheetConfig{
		Rows:    append([]string{}, config.Rows...),
		Columns: append([]string{}, config.Columns...),
		Values:  append([]string{}, config.Values...),
		Meta:    make([]domain.SpreadsheetMetaField, len(config.Meta)),
	}
	copy(cloned.Meta, config.Meta)
	return cloned
}

func cloneSpreadsheetFilters(filters []domain.SpreadsheetFilter) []domain.SpreadsheetFilter {
	cloned := make([]domain.SpreadsheetFilter, len(filters))
	copy(cloned, filters)
	return cloned
}

func cloneSpreadsheetSort(sortState domain.SpreadsheetSort) domain.SpreadsheetSort {
	cloned := domain.SpreadsheetSort{Order: sortState.Order}
	if sortState.Field != nil {
		field := *sortState.Field
		cloned.Field = &field
	}
	if cloned.Order == "" {
		cloned.Order = "desc"
	}
	return cloned
}

func sanitizeSpreadsheetFilename(title string, mode domain.SpreadsheetMode) string {
	name := strings.TrimSpace(title)
	if name == "" {
		name = "spreadsheet"
	}
	name = strings.NewReplacer("/", "_", "\\", "_", ":", "_", "*", "_", "?", "_", "\"", "_", "<", "_", ">", "_", "|", "_").Replace(name)
	return fmt.Sprintf("%s_%s.xlsx", name, mode)
}

func applySpreadsheetFilters(records []domain.SpreadsheetRecord, filters []domain.SpreadsheetFilter) []domain.SpreadsheetRecord {
	if len(filters) == 0 {
		return records
	}
	filtered := make([]domain.SpreadsheetRecord, 0, len(records))
	for _, record := range records {
		matched := true
		for _, filter := range filters {
			left := strings.TrimSpace(stringifySpreadsheetValue(record[filter.Field]))
			right := strings.TrimSpace(filter.Value)
			switch filter.Operator {
			case "equals":
				matched = left == right
			case "greater":
				matched = compareSpreadsheetNumber(left, right) > 0
			case "less":
				matched = compareSpreadsheetNumber(left, right) < 0
			default:
				matched = strings.Contains(strings.ToLower(left), strings.ToLower(right))
			}
			if !matched {
				break
			}
		}
		if matched {
			filtered = append(filtered, record)
		}
	}
	return filtered
}

func applySpreadsheetSort(records []domain.SpreadsheetRecord, sortState domain.SpreadsheetSort) []domain.SpreadsheetRecord {
	if sortState.Field == nil || strings.TrimSpace(*sortState.Field) == "" {
		return records
	}

	field := strings.TrimSpace(*sortState.Field)
	ascending := sortState.Order == "asc"

	cloned := append([]domain.SpreadsheetRecord{}, records...)
	sort.SliceStable(cloned, func(i, j int) bool {
		left := stringifySpreadsheetValue(cloned[i][field])
		right := stringifySpreadsheetValue(cloned[j][field])
		leftAsNumber, leftErr := parseSpreadsheetNumber(left)
		rightAsNumber, rightErr := parseSpreadsheetNumber(right)
		if leftErr == nil && rightErr == nil {
			if ascending {
				return leftAsNumber < rightAsNumber
			}
			return leftAsNumber > rightAsNumber
		}
		if ascending {
			return strings.Compare(left, right) < 0
		}
		return strings.Compare(left, right) > 0
	})
	return cloned
}

func buildSpreadsheetExport(block *domain.SpreadsheetBlock, records []domain.SpreadsheetRecord) ([]domain.SpreadsheetRecord, []string) {
	if block.Mode != domain.SpreadsheetModePivot {
		return buildTableExport(block, records)
	}
	return buildPivotExport(block, records)
}

func buildTableExport(block *domain.SpreadsheetBlock, records []domain.SpreadsheetRecord) ([]domain.SpreadsheetRecord, []string) {
	fields := make([]string, 0)
	if len(block.Config.Meta) > 0 {
		for _, meta := range block.Config.Meta {
			fields = append(fields, meta.Field)
		}
	} else if len(records) > 0 {
		seen := map[string]struct{}{}
		for _, record := range records {
			for field := range record {
				if _, ok := seen[field]; ok {
					continue
				}
				seen[field] = struct{}{}
				fields = append(fields, field)
			}
		}
	}
	return records, fields
}

func buildPivotExport(block *domain.SpreadsheetBlock, records []domain.SpreadsheetRecord) ([]domain.SpreadsheetRecord, []string) {
	rowFields := append([]string{}, block.Config.Rows...)
	columnFields := append([]string{}, block.Config.Columns...)
	valueFields := append([]string{}, block.Config.Values...)
	if block.ActiveMetric != nil {
		metric := strings.TrimSpace(*block.ActiveMetric)
		for _, candidate := range valueFields {
			if candidate == metric {
				valueFields = []string{metric}
				break
			}
		}
	}
	if len(valueFields) == 0 {
		valueFields = append([]string{}, block.Config.Values...)
	}

	rowBuckets := map[string][]domain.SpreadsheetRecord{}
	rowOrder := make([]string, 0)
	columnOrder := make([]string, 0)
	columnSeen := map[string]struct{}{}

	for _, record := range records {
		rowKey := joinSpreadsheetKey(record, rowFields)
		columnKey := joinSpreadsheetKey(record, columnFields)
		if _, ok := columnSeen[columnKey]; !ok {
			columnSeen[columnKey] = struct{}{}
			columnOrder = append(columnOrder, columnKey)
		}
		if _, ok := rowBuckets[rowKey]; !ok {
			rowOrder = append(rowOrder, rowKey)
		}
		rowBuckets[rowKey] = append(rowBuckets[rowKey], record)
	}

	columns := append([]string{}, rowFields...)
	for _, columnKey := range columnOrder {
		for _, valueField := range valueFields {
			columns = append(columns, fmt.Sprintf("%s · %s", columnKey, getSpreadsheetFieldLabel(block.Config, valueField)))
		}
	}

	rows := make([]domain.SpreadsheetRecord, 0, len(rowOrder))
	for _, rowKey := range rowOrder {
		bucket := rowBuckets[rowKey]
		row := domain.SpreadsheetRecord{}
		sample := domain.SpreadsheetRecord{}
		if len(bucket) > 0 {
			sample = bucket[0]
		}
		parts := strings.Split(rowKey, " / ")
		for index, field := range rowFields {
			if index < len(parts) {
				row[field] = parts[index]
			} else {
				row[field] = sample[field]
			}
		}
		for _, columnKey := range columnOrder {
			columnBucket := filterSpreadsheetBucket(bucket, columnFields, columnKey)
			for _, valueField := range valueFields {
				label := fmt.Sprintf("%s · %s", columnKey, getSpreadsheetFieldLabel(block.Config, valueField))
				var total float64
				for _, item := range columnBucket {
					value, err := parseSpreadsheetNumber(stringifySpreadsheetValue(item[valueField]))
					if err != nil {
						continue
					}
					total += value
				}
				row[label] = total
			}
		}
		rows = append(rows, row)
	}

	return rows, columns
}

func filterSpreadsheetBucket(records []domain.SpreadsheetRecord, fields []string, key string) []domain.SpreadsheetRecord {
	if len(fields) == 0 {
		return records
	}
	filtered := make([]domain.SpreadsheetRecord, 0)
	for _, record := range records {
		if joinSpreadsheetKey(record, fields) == key {
			filtered = append(filtered, record)
		}
	}
	return filtered
}

func joinSpreadsheetKey(record domain.SpreadsheetRecord, fields []string) string {
	if len(fields) == 0 {
		return "总计"
	}
	parts := make([]string, 0, len(fields))
	for _, field := range fields {
		parts = append(parts, stringifySpreadsheetValue(record[field]))
	}
	joined := strings.Join(parts, " / ")
	if joined == "" {
		return "总计"
	}
	return joined
}

func getSpreadsheetFieldLabel(config domain.SpreadsheetConfig, field string) string {
	for _, meta := range config.Meta {
		if meta.Field == field {
			if strings.TrimSpace(meta.Name) != "" {
				return meta.Name
			}
			break
		}
	}
	return field
}

func stringifySpreadsheetValue(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprint(value)
}

func parseSpreadsheetNumber(value string) (float64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, fmt.Errorf("empty value")
	}
	var number float64
	_, err := fmt.Sscan(value, &number)
	if err != nil {
		return 0, err
	}
	return number, nil
}

func compareSpreadsheetNumber(left, right string) int {
	leftNumber, leftErr := parseSpreadsheetNumber(left)
	rightNumber, rightErr := parseSpreadsheetNumber(right)
	if leftErr != nil || rightErr != nil {
		return strings.Compare(left, right)
	}
	if leftNumber < rightNumber {
		return -1
	}
	if leftNumber > rightNumber {
		return 1
	}
	return 0
}
