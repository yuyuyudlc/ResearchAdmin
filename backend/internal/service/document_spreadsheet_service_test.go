package service

import (
	"context"
	"testing"

	"research/internal/database"
	"research/internal/domain"
	"research/internal/repository"

	"gorm.io/gorm"
)

func newSpreadsheetTestService(t *testing.T) (*DocumentService, *gorm.DB) {
	t.Helper()
	db, err := database.Open("file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db.DB() error = %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})
	svc := NewDocumentService(
		repository.NewWorkspaceRepository(db),
		repository.NewWorkspaceMemberRepository(db),
		repository.NewDocumentRepository(db),
		repository.NewDocumentAccessRepository(db),
		repository.NewDocumentFavoriteRepository(db),
		repository.NewDocACLRepository(db),
		repository.NewUserRepository(db),
		repository.NewDocumentBodyRepository(db),
		repository.NewSpreadsheetBlockRepository(db),
	)
	return svc, db
}

func TestSpreadsheetBlockLifecycle(t *testing.T) {
	ctx := context.Background()
	svc, db := newSpreadsheetTestService(t)

	owner := createTestUser(t, db, "spreadsheet-owner@example.com")
	workspace, err := svc.CreateWorkspace(ctx, CreateWorkspaceRequest{UserID: owner.ID, Name: "表格空间"})
	if err != nil {
		t.Fatalf("CreateWorkspace() error = %v", err)
	}
	doc, err := svc.CreateDocument(ctx, CreateDocumentRequest{UserID: owner.ID, WorkspaceID: workspace.ID, Title: "表格文档"})
	if err != nil {
		t.Fatalf("CreateDocument() error = %v", err)
	}

	block, err := svc.GetSpreadsheetBlock(ctx, owner.ID, doc.ID, "sheet-1")
	if err != nil {
		t.Fatalf("GetSpreadsheetBlock() error = %v", err)
	}
	if block.BlockID != "sheet-1" {
		t.Fatalf("block.BlockID = %s, want sheet-1", block.BlockID)
	}
	if block.Title != "多维表格" {
		t.Fatalf("block.Title = %s, want 多维表格", block.Title)
	}

	repo := repository.NewSpreadsheetBlockRepository(db)
	seed := &domain.SpreadsheetBlock{
		DocumentID: doc.ID,
		BlockID:    "sheet-1",
		Title:      "统计表",
		Mode:       domain.SpreadsheetModeTable,
		Config: domain.SpreadsheetConfig{
			Meta: []domain.SpreadsheetMetaField{{Field: "name", Name: "名称"}, {Field: "score", Name: "得分", Type: "metric"}},
		},
		Records: []domain.SpreadsheetRecord{{"name": "Alice", "score": 98}},
		Filters: []domain.SpreadsheetFilter{},
		Sort:    domain.SpreadsheetSort{Order: "desc"},
	}
	if err := repo.Save(ctx, seed); err != nil {
		t.Fatalf("Save(seed) error = %v", err)
	}

	updated, err := svc.UpdateSpreadsheetCell(ctx, owner.ID, doc.ID, "sheet-1", UpdateSpreadsheetCellRequest{
		RowIndex: 0,
		Field:    "score",
		Value:    100,
	})
	if err != nil {
		t.Fatalf("UpdateSpreadsheetCell() error = %v", err)
	}
	if got := updated.Records[0]["score"]; got != 100 {
		t.Fatalf("updated score = %v, want 100", got)
	}

	created, err := svc.CreateSpreadsheetRecord(ctx, owner.ID, doc.ID, "sheet-1", CreateSpreadsheetRecordRequest{})
	if err != nil {
		t.Fatalf("CreateSpreadsheetRecord() error = %v", err)
	}
	if len(created.Records) != 2 {
		t.Fatalf("created records = %d, want 2", len(created.Records))
	}
	if created.Records[1] == nil {
		t.Fatal("created record should not be nil")
	}

	export, err := svc.ExportSpreadsheetBlock(ctx, owner.ID, doc.ID, "sheet-1")
	if err != nil {
		t.Fatalf("ExportSpreadsheetBlock() error = %v", err)
	}
	if export.Filename == "" {
		t.Fatal("export filename should not be empty")
	}
	if len(export.Rows) != 2 {
		t.Fatalf("export rows = %d, want 2", len(export.Rows))
	}
	if len(export.Columns) == 0 {
		t.Fatal("export columns should not be empty")
	}

	if err := svc.PutSpreadsheetBody(ctx, owner.ID, doc.ID, "sheet-1", []byte("snapshot")); err != nil {
		t.Fatalf("PutSpreadsheetBody() error = %v", err)
	}
	body, err := svc.GetSpreadsheetBody(ctx, owner.ID, doc.ID, "sheet-1")
	if err != nil {
		t.Fatalf("GetSpreadsheetBody() error = %v", err)
	}
	if string(body) != "snapshot" {
		t.Fatalf("snapshot body = %q, want snapshot", string(body))
	}
}
