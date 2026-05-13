package service

import (
	"context"
	"path/filepath"
	"testing"

	"research/internal/database"
	"research/internal/domain"
	"research/internal/repository"

	"gorm.io/gorm"
)

func TestDocumentPermissionResolution(t *testing.T) {
	ctx := context.Background()
	svc, db := newTestDocumentService(t)

	owner := createTestUser(t, db, "owner@example.com")
	member := createTestUser(t, db, "member@example.com")
	external := createTestUser(t, db, "external@example.com")

	workspace, err := svc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID,
		Name:   "研发空间",
	})
	if err != nil {
		t.Fatalf("CreateWorkspace() error = %v", err)
	}
	if _, err := svc.AddMember(ctx, UpsertWorkspaceMemberRequest{
		OperatorUserID: owner.ID,
		WorkspaceID:    workspace.ID,
		UserID:         member.ID,
		Role:           domain.WorkspaceMemberRoleMember,
	}); err != nil {
		t.Fatalf("AddMember() error = %v", err)
	}

	root, err := svc.CreateDocument(ctx, CreateDocumentRequest{
		UserID:      owner.ID,
		WorkspaceID: workspace.ID,
		Title:       "根文档",
	})
	if err != nil {
		t.Fatalf("CreateDocument(root) error = %v", err)
	}
	child, err := svc.CreateDocument(ctx, CreateDocumentRequest{
		UserID:      owner.ID,
		WorkspaceID: workspace.ID,
		ParentID:    &root.ID,
		Title:       "子文档",
	})
	if err != nil {
		t.Fatalf("CreateDocument(child) error = %v", err)
	}

	memberPerm, err := svc.MyPermission(ctx, member.ID, root.ID)
	if err != nil {
		t.Fatalf("MyPermission(member) error = %v", err)
	}
	if memberPerm.PermissionBit != domain.PermissionRead|domain.PermissionEdit {
		t.Fatalf("member permission = %d, want 3", memberPerm.PermissionBit)
	}

	if _, err := svc.CreateACL(ctx, CreateACLRequest{
		UserID:        owner.ID,
		DocumentID:    root.ID,
		SubjectType:   domain.ACLSubjectTypeUser,
		SubjectID:     &member.ID,
		PermissionBit: domain.PermissionDeny,
	}); err != nil {
		t.Fatalf("CreateACL(deny member) error = %v", err)
	}
	memberPerm, err = svc.MyPermission(ctx, member.ID, root.ID)
	if err != nil {
		t.Fatalf("MyPermission(denied member) error = %v", err)
	}
	if memberPerm.PermissionBit != 0 {
		t.Fatalf("denied member permission = %d, want 0", memberPerm.PermissionBit)
	}

	if _, err := svc.CreateACL(ctx, CreateACLRequest{
		UserID:        owner.ID,
		DocumentID:    root.ID,
		SubjectType:   domain.ACLSubjectTypeUser,
		SubjectID:     &owner.ID,
		PermissionBit: domain.PermissionDeny,
	}); err != nil {
		t.Fatalf("CreateACL(deny owner) error = %v", err)
	}
	ownerPerm, err := svc.MyPermission(ctx, owner.ID, root.ID)
	if err != nil {
		t.Fatalf("MyPermission(owner) error = %v", err)
	}
	if ownerPerm.PermissionBit != fullPermission {
		t.Fatalf("owner permission = %d, want 7", ownerPerm.PermissionBit)
	}

	if _, err := svc.CreateACL(ctx, CreateACLRequest{
		UserID:        owner.ID,
		DocumentID:    root.ID,
		SubjectType:   domain.ACLSubjectTypeUser,
		SubjectID:     &external.ID,
		PermissionBit: domain.PermissionRead,
		Inherit:       true,
	}); err != nil {
		t.Fatalf("CreateACL(inherit external) error = %v", err)
	}
	externalPerm, err := svc.MyPermission(ctx, external.ID, child.ID)
	if err != nil {
		t.Fatalf("MyPermission(external child) error = %v", err)
	}
	if externalPerm.PermissionBit != domain.PermissionRead {
		t.Fatalf("external inherited permission = %d, want 1", externalPerm.PermissionBit)
	}
}

func TestWorkspaceCannotLoseLastOwner(t *testing.T) {
	ctx := context.Background()
	svc, db := newTestDocumentService(t)

	owner := createTestUser(t, db, "owner@example.com")
	workspace, err := svc.CreateWorkspace(ctx, CreateWorkspaceRequest{UserID: owner.ID, Name: "研发空间"})
	if err != nil {
		t.Fatalf("CreateWorkspace() error = %v", err)
	}

	_, err = svc.UpdateMember(ctx, UpsertWorkspaceMemberRequest{
		OperatorUserID: owner.ID,
		WorkspaceID:    workspace.ID,
		UserID:         owner.ID,
		Role:           domain.WorkspaceMemberRoleMember,
	})
	if err == nil {
		t.Fatal("UpdateMember() error = nil, want last-owner error")
	}
	if err != ErrLastWorkspaceOwner {
		t.Fatalf("UpdateMember() error = %v, want %v", err, ErrLastWorkspaceOwner)
	}

	err = svc.RemoveMember(ctx, owner.ID, workspace.ID, owner.ID)
	if err == nil {
		t.Fatal("RemoveMember() error = nil, want last-owner error")
	}
	if err != ErrLastWorkspaceOwner {
		t.Fatalf("RemoveMember() error = %v, want %v", err, ErrLastWorkspaceOwner)
	}
}

func newTestDocumentService(t *testing.T) (*DocumentService, *gorm.DB) {
	t.Helper()
	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	svc := NewDocumentService(
		repository.NewWorkspaceRepository(db),
		repository.NewWorkspaceMemberRepository(db),
		repository.NewDocumentRepository(db),
		repository.NewDocACLRepository(db),
		repository.NewUserRepository(db),
	)
	return svc, db
}

func createTestUser(t *testing.T, db *gorm.DB, email string) domain.User {
	t.Helper()
	user := domain.User{
		Username:     email,
		Email:        email,
		DisplayName:  email,
		Status:       "active",
		PasswordHash: "hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Create(User) error = %v", err)
	}
	return user
}
