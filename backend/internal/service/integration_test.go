package service

import (
	"context"
	"testing"
	"time"

	"research/internal/auth"
	"research/internal/domain"
	"research/internal/repository"

	"gorm.io/gorm"
)

func newTestAuthService(t *testing.T) (*AuthService, *DocumentService, *gorm.DB) {
	t.Helper()
	_, db := newTestDocumentService(t)
	userRepo := repository.NewUserRepository(db)
	docSvc := NewDocumentService(
		repository.NewWorkspaceRepository(db),
		repository.NewWorkspaceMemberRepository(db),
		repository.NewDocumentRepository(db),
		repository.NewDocACLRepository(db),
		userRepo,
		repository.NewDocumentBodyRepository(db),
	)
	tokenManager := auth.NewTokenManager("test-secret", 3600*time.Second)
	authSvc := NewAuthService(userRepo, tokenManager, docSvc)
	return authSvc, docSvc, db
}

// ==================== Auth Tests ====================

func TestRegisterAndLogin(t *testing.T) {
	ctx := context.Background()
	authSvc, _, _ := newTestAuthService(t)

	err := authSvc.Register(ctx, RegisterRequest{
		Username:          "张三",
		Email:             "zhangsan@example.com",
		Password:          "123456",
		Organization:      "智能计算实验室",
		ProfessionalTitle: domain.ProfessionalTitleResearcher,
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	result, err := authSvc.Login(ctx, "zhangsan@example.com", "123456")
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	if result.AccessToken == "" {
		t.Fatal("Login() token is empty")
	}
	if result.User.Email != "zhangsan@example.com" {
		t.Fatalf("Login() email = %s, want zhangsan@example.com", result.User.Email)
	}
	if result.ExpiresIn != 3600 {
		t.Fatalf("Login() expiresIn = %d, want 3600", result.ExpiresIn)
	}
}

func TestRegisterCreatesPrivateWorkspace(t *testing.T) {
	ctx := context.Background()
	authSvc, docSvc, _ := newTestAuthService(t)

	err := authSvc.Register(ctx, RegisterRequest{
		Username: "李四",
		Email:    "lisi@example.com",
		Password: "123456",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	result, err := authSvc.Login(ctx, "lisi@example.com", "123456")
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}

	workspaces, err := docSvc.ListWorkspaces(ctx, result.User.ID)
	if err != nil {
		t.Fatalf("ListWorkspaces() error = %v", err)
	}
	if len(workspaces) != 1 {
		t.Fatalf("ListWorkspaces() len = %d, want 1", len(workspaces))
	}
	if workspaces[0].Name != "我的私人空间" {
		t.Fatalf("private workspace name = %s, want 我的私人空间", workspaces[0].Name)
	}
	if workspaces[0].Role != domain.WorkspaceMemberRoleOwner {
		t.Fatalf("private workspace role = %s, want owner", workspaces[0].Role)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	ctx := context.Background()
	authSvc, _, _ := newTestAuthService(t)

	_ = authSvc.Register(ctx, RegisterRequest{
		Username: "王五",
		Email:    "wangwu@example.com",
		Password: "123456",
	})

	_, err := authSvc.Login(ctx, "wangwu@example.com", "wrong")
	if err == nil {
		t.Fatal("Login() error = nil, want error")
	}
}

func TestDuplicateEmail(t *testing.T) {
	ctx := context.Background()
	authSvc, _, _ := newTestAuthService(t)

	_ = authSvc.Register(ctx, RegisterRequest{
		Username: "a", Email: "dup@example.com", Password: "123456",
	})
	err := authSvc.Register(ctx, RegisterRequest{
		Username: "b", Email: "dup@example.com", Password: "123456",
	})
	if err == nil {
		t.Fatal("Register(duplicate) error = nil, want error")
	}
}

func TestChangePassword(t *testing.T) {
	ctx := context.Background()
	authSvc, _, _ := newTestAuthService(t)

	_ = authSvc.Register(ctx, RegisterRequest{
		Username: "pwd", Email: "pwd@example.com", Password: "123456",
	})
	result, _ := authSvc.Login(ctx, "pwd@example.com", "123456")

	err := authSvc.ChangePassword(ctx, ChangePasswordRequest{
		UserID:      result.User.ID,
		OldPassword: "123456",
		NewPassword: "newpwd123",
	})
	if err != nil {
		t.Fatalf("ChangePassword() error = %v", err)
	}

	_, err = authSvc.Login(ctx, "pwd@example.com", "123456")
	if err == nil {
		t.Fatal("Login(old password) should fail after password change")
	}

	result2, err := authSvc.Login(ctx, "pwd@example.com", "newpwd123")
	if err != nil {
		t.Fatalf("Login(new password) error = %v", err)
	}
	if result2.AccessToken == "" {
		t.Fatal("Login(new password) token empty")
	}
}

func TestUpdateProfile(t *testing.T) {
	ctx := context.Background()
	authSvc, _, _ := newTestAuthService(t)

	_ = authSvc.Register(ctx, RegisterRequest{
		Username: "旧名", Email: "profile@example.com", Password: "123456",
	})
	result, _ := authSvc.Login(ctx, "profile@example.com", "123456")

	err := authSvc.UpdateProfile(ctx, UpdateProfileRequest{
		UserID:   result.User.ID,
		Username: "新名",
		Email:    "newemail@example.com",
	})
	if err != nil {
		t.Fatalf("UpdateProfile() error = %v", err)
	}

	result2, _ := authSvc.Login(ctx, "newemail@example.com", "123456")
	if result2.User.Username != "新名" {
		t.Fatalf("username = %s, want 新名", result2.User.Username)
	}
}

// ==================== Workspace Tests ====================

func TestCreateAndListWorkspaces(t *testing.T) {
	ctx := context.Background()
	authSvc, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "wsowner@example.com")

	ws1, err := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "项目A", Description: "描述A",
	})
	if err != nil {
		t.Fatalf("CreateWorkspace() error = %v", err)
	}
	if ws1.Name != "项目A" {
		t.Fatalf("workspace name = %s, want 项目A", ws1.Name)
	}

	_, err = docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "项目B",
	})
	if err != nil {
		t.Fatalf("CreateWorkspace(B) error = %v", err)
	}

	items, err := docSvc.ListWorkspaces(ctx, owner.ID)
	if err != nil {
		t.Fatalf("ListWorkspaces() error = %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("ListWorkspaces() len = %d, want 2", len(items))
	}
	if items[0].Role != domain.WorkspaceMemberRoleOwner {
		t.Fatal("member role should be owner")
	}

	// 不相关的用户看不到这些 workspace
	other := createTestUser(t, db, "other@example.com")
	items, err = docSvc.ListWorkspaces(ctx, other.ID)
	if err != nil {
		t.Fatalf("ListWorkspaces(other) error = %v", err)
	}
	_ = authSvc // used to init db
	if len(items) != 0 {
		t.Fatalf("other user should see 0 workspaces, got %d", len(items))
	}
}

func TestUpdateAndDeleteWorkspace(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "updatews@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "待更新",
	})

	newName := "已更新"
	updated, err := docSvc.UpdateWorkspace(ctx, UpdateWorkspaceRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Name: &newName,
	})
	if err != nil {
		t.Fatalf("UpdateWorkspace() error = %v", err)
	}
	if updated.Name != "已更新" {
		t.Fatalf("updated name = %s, want 已更新", updated.Name)
	}

	err = docSvc.DeleteWorkspace(ctx, owner.ID, ws.ID)
	if err != nil {
		t.Fatalf("DeleteWorkspace() error = %v", err)
	}

	items, _ := docSvc.ListWorkspaces(ctx, owner.ID)
	if len(items) != 0 {
		t.Fatal("should have 0 workspaces after delete")
	}
}

// ==================== Member Tests ====================

func TestMemberManagement(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "memowner@example.com")
	member := createTestUser(t, db, "memuser@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "成员测试",
	})

	added, err := docSvc.AddMember(ctx, UpsertWorkspaceMemberRequest{
		OperatorUserID: owner.ID,
		WorkspaceID:    ws.ID,
		UserID:         member.ID,
		Role:           domain.WorkspaceMemberRoleMember,
	})
	if err != nil {
		t.Fatalf("AddMember() error = %v", err)
	}
	if added.Role != domain.WorkspaceMemberRoleMember {
		t.Fatalf("added role = %s, want member", added.Role)
	}

	members, err := docSvc.ListMembers(ctx, owner.ID, ws.ID)
	if err != nil {
		t.Fatalf("ListMembers() error = %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("member count = %d, want 2 (owner + member)", len(members))
	}

	updated, err := docSvc.UpdateMember(ctx, UpsertWorkspaceMemberRequest{
		OperatorUserID: owner.ID,
		WorkspaceID:    ws.ID,
		UserID:         member.ID,
		Role:           domain.WorkspaceMemberRoleOwner,
	})
	if err != nil {
		t.Fatalf("UpdateMember() error = %v", err)
	}
	if updated.Role != domain.WorkspaceMemberRoleOwner {
		t.Fatalf("updated role = %s, want owner", updated.Role)
	}

	err = docSvc.RemoveMember(ctx, owner.ID, ws.ID, member.ID)
	if err != nil {
		t.Fatalf("RemoveMember() error = %v", err)
	}
	members, _ = docSvc.ListMembers(ctx, owner.ID, ws.ID)
	if len(members) != 1 {
		t.Fatalf("after remove member count = %d, want 1", len(members))
	}
}

func TestLastOwnerCannotBeRemoved(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "solowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "单人空间",
	})

	err := docSvc.RemoveMember(ctx, owner.ID, ws.ID, owner.ID)
	if err != ErrLastWorkspaceOwner {
		t.Fatalf("RemoveMember(last owner) error = %v, want ErrLastWorkspaceOwner", err)
	}
}

// ==================== Document Tests ====================

func TestDocumentCRUD(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "docowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "文档测试",
	})

	doc, err := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID:      owner.ID,
		WorkspaceID: ws.ID,
		Title:       "需求文档",
		Summary:     "V1.0",
		DocType:     domain.DocumentTypeRichText,
	})
	if err != nil {
		t.Fatalf("CreateDocument() error = %v", err)
	}
	if doc.Title != "需求文档" {
		t.Fatalf("doc title = %s, want 需求文档", doc.Title)
	}

	detail, err := docSvc.GetDocumentDetail(ctx, owner.ID, doc.ID)
	if err != nil {
		t.Fatalf("GetDocumentDetail() error = %v", err)
	}
	if detail.ID != doc.ID {
		t.Fatal("doc ID mismatch")
	}

	newTitle := "需求文档 V2"
	updated, err := docSvc.UpdateDocument(ctx, UpdateDocumentRequest{
		UserID: owner.ID, DocumentID: doc.ID, Title: &newTitle,
	})
	if err != nil {
		t.Fatalf("UpdateDocument() error = %v", err)
	}
	if updated.Title != "需求文档 V2" {
		t.Fatalf("updated title = %s, want 需求文档 V2", updated.Title)
	}
}

func TestDocumentArchiveAndRestore(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "archiveowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "归档测试",
	})
	doc, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "待归档",
	})

	err := docSvc.SetDocumentStatus(ctx, owner.ID, doc.ID, domain.DocumentStatusArchived)
	if err != nil {
		t.Fatalf("Archive error = %v", err)
	}

	detail, _ := docSvc.GetDocumentDetail(ctx, owner.ID, doc.ID)
	if detail.Status != domain.DocumentStatusArchived {
		t.Fatalf("status = %s, want archived", detail.Status)
	}

	err = docSvc.SetDocumentStatus(ctx, owner.ID, doc.ID, domain.DocumentStatusActive)
	if err != nil {
		t.Fatalf("Restore error = %v", err)
	}
}

func TestDocumentMove(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "moveowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "移动测试",
	})
	root, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "根文档",
	})
	child, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, ParentID: &root.ID, Title: "子文档",
	})

	result, err := docSvc.MoveDocument(ctx, MoveDocumentRequest{
		UserID: owner.ID, DocumentID: child.ID, ParentID: nil,
	})
	if err != nil {
		t.Fatalf("MoveDocument() error = %v", err)
	}
	if result.ParentID != nil {
		t.Fatal("after move to root, parentId should be nil")
	}
}

func TestCannotMoveToDescendant(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "cycleowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "循环测试",
	})
	root, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "根",
	})
	child, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, ParentID: &root.ID, Title: "子",
	})

	_, err := docSvc.MoveDocument(ctx, MoveDocumentRequest{
		UserID: owner.ID, DocumentID: root.ID, ParentID: &child.ID,
	})
	if err == nil {
		t.Fatal("MoveDocument(ancestor to descendant) should fail")
	}
}

func TestDocumentDeleteSoftFlag(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "delowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "删除测试",
	})
	doc, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "待删除",
	})

	err := docSvc.SetDocumentStatus(ctx, owner.ID, doc.ID, domain.DocumentStatusDeleted)
	if err != nil {
		t.Fatalf("Delete error = %v", err)
	}

	_, err = docSvc.GetDocumentDetail(ctx, owner.ID, doc.ID)
	if err != ErrNotFound {
		t.Fatalf("GetDocumentDetail(deleted) error = %v, want ErrNotFound", err)
	}
}

// ==================== ACL Tests ====================

func TestACLManagement(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "aclowner@example.com")
	user := createTestUser(t, db, "acluser@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "ACL测试",
	})
	doc, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "ACL文档",
	})

	created, err := docSvc.CreateACL(ctx, CreateACLRequest{
		UserID:        owner.ID,
		DocumentID:    doc.ID,
		SubjectType:   domain.ACLSubjectTypeUser,
		SubjectID:     &user.ID,
		PermissionBit: domain.PermissionRead,
		Inherit:       true,
	})
	if err != nil {
		t.Fatalf("CreateACL() error = %v", err)
	}
	if created.PermissionBit != domain.PermissionRead {
		t.Fatalf("permissionBit = %d, want 1", created.PermissionBit)
	}

	items, err := docSvc.ListACL(ctx, owner.ID, doc.ID)
	if err != nil {
		t.Fatalf("ListACL() error = %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("ACL count = %d, want 1", len(items))
	}

	editPerm := domain.PermissionRead | domain.PermissionEdit
	updated, err := docSvc.UpdateACL(ctx, UpdateACLRequest{
		UserID: owner.ID, DocumentID: doc.ID, ACLID: created.ID, PermissionBit: &editPerm,
	})
	if err != nil {
		t.Fatalf("UpdateACL() error = %v", err)
	}
	if updated.PermissionBit != editPerm {
		t.Fatalf("updated permissionBit = %d, want 3", updated.PermissionBit)
	}

	err = docSvc.DeleteACL(ctx, owner.ID, doc.ID, created.ID)
	if err != nil {
		t.Fatalf("DeleteACL() error = %v", err)
	}
	items, _ = docSvc.ListACL(ctx, owner.ID, doc.ID)
	if len(items) != 0 {
		t.Fatal("after delete ACL count should be 0")
	}
}

// ==================== Permission Tests ====================

func TestMyPermission(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "permowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "权限测试",
	})
	doc, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "权限文档",
	})

	perm, err := docSvc.MyPermission(ctx, owner.ID, doc.ID)
	if err != nil {
		t.Fatalf("MyPermission() error = %v", err)
	}
	if !perm.CanRead || !perm.CanEdit || !perm.CanManage {
		t.Fatal("owner should have full permission")
	}
	if perm.PermissionBit != domain.PermissionRead|domain.PermissionEdit|domain.PermissionManage {
		t.Fatalf("owner permissionBit = %d, want 7", perm.PermissionBit)
	}

	// 外部用户无权限 — 返回 0 权限而非报错
	external := createTestUser(t, db, "permexternal@example.com")
	extPerm, err := docSvc.MyPermission(ctx, external.ID, doc.ID)
	if err != nil {
		t.Fatalf("MyPermission(external) error = %v", err)
	}
	if extPerm.PermissionBit != 0 {
		t.Fatalf("external permissionBit = %d, want 0", extPerm.PermissionBit)
	}
	if extPerm.CanRead || extPerm.CanEdit || extPerm.CanManage {
		t.Fatal("external should have no permissions")
	}
}

// ==================== Directory Tests ====================

func TestWorkspaceDirectory(t *testing.T) {
	ctx := context.Background()
	_, docSvc, db := newTestAuthService(t)

	owner := createTestUser(t, db, "diroowner@example.com")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: owner.ID, Name: "目录测试",
	})
	root, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, Title: "根文档",
	})
	child, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: owner.ID, WorkspaceID: ws.ID, ParentID: &root.ID, Title: "子文档",
	})

	dir, err := docSvc.GetWorkspaceDirectory(ctx, owner.ID, ws.ID, nil, domain.DocumentStatusActive, 50)
	if err != nil {
		t.Fatalf("GetWorkspaceDirectory(root) error = %v", err)
	}
	if dir.Workspace.ID != ws.ID {
		t.Fatal("workspace ID mismatch")
	}
	if dir.CurrentMember == nil || dir.CurrentMember.Role != domain.WorkspaceMemberRoleOwner {
		t.Fatal("current member should be owner")
	}
	if dir.Parent != nil {
		t.Fatal("root directory parent should be nil")
	}
	if len(dir.Items) != 1 || dir.Items[0].ID != root.ID {
		t.Fatalf("root items count = %d, want 1 (root doc)", len(dir.Items))
	}
	if !dir.Items[0].HasChildren {
		t.Fatal("root doc should have children")
	}

	sub, err := docSvc.GetWorkspaceDirectory(ctx, owner.ID, ws.ID, &root.ID, domain.DocumentStatusActive, 50)
	if err != nil {
		t.Fatalf("GetWorkspaceDirectory(child) error = %v", err)
	}
	if len(sub.Items) != 1 || sub.Items[0].ID != child.ID {
		t.Fatalf("sub items count = %d, want 1 (child doc)", len(sub.Items))
	}
	if sub.Parent == nil || sub.Parent.ID != root.ID {
		t.Fatal("parent should be root doc")
	}
	_ = child // used
}

// ==================== Full Journey ====================

func TestFullUserJourney(t *testing.T) {
	ctx := context.Background()
	authSvc, docSvc, db := newTestAuthService(t)

	t.Log("Step 1: 注册")
	err := authSvc.Register(ctx, RegisterRequest{
		Username: "赵六", Email: "zhaoliu@example.com", Password: "123456",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	t.Log("Step 2: 登录")
	result, err := authSvc.Login(ctx, "zhaoliu@example.com", "123456")
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	userID := result.User.ID

	t.Log("Step 3: 验证私人空间已创建")
	wss, _ := docSvc.ListWorkspaces(ctx, userID)
	if len(wss) != 1 || wss[0].Name != "我的私人空间" {
		t.Fatal("private workspace not created")
	}

	t.Log("Step 4: 创建项目 workspace")
	ws, _ := docSvc.CreateWorkspace(ctx, CreateWorkspaceRequest{
		UserID: userID, Name: "研究项目", Description: "科研文档",
	})

	t.Log("Step 5: 创建文档树")
	root, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: userID, WorkspaceID: ws.ID, Title: "设计文档",
	})
	child, _ := docSvc.CreateDocument(ctx, CreateDocumentRequest{
		UserID: userID, WorkspaceID: ws.ID, ParentID: &root.ID, Title: "API 设计",
	})

	t.Log("Step 6: 添加成员")
	member := createTestUser(t, db, "zhaoliu-member@example.com")
	_, err = docSvc.AddMember(ctx, UpsertWorkspaceMemberRequest{
		OperatorUserID: userID, WorkspaceID: ws.ID, UserID: member.ID,
		Role: domain.WorkspaceMemberRoleMember,
	})
	if err != nil {
		t.Fatalf("AddMember() error = %v", err)
	}

	t.Log("Step 7: 成员可以读文档")
	memberPerm, err := docSvc.MyPermission(ctx, member.ID, root.ID)
	if err != nil {
		t.Fatalf("MyPermission(member) error = %v", err)
	}
	if !memberPerm.CanRead && !memberPerm.CanEdit {
		t.Fatal("member should have read+edit")
	}

	t.Log("Step 8: 设置 ACL 分享给外部用户")
	external := createTestUser(t, db, "zhaoliu-external@example.com")
	_, err = docSvc.CreateACL(ctx, CreateACLRequest{
		UserID:        userID, DocumentID: root.ID,
		SubjectType:   domain.ACLSubjectTypeUser,
		SubjectID:     &external.ID,
		PermissionBit: domain.PermissionRead,
		Inherit:       true,
	})
	if err != nil {
		t.Fatalf("CreateACL() error = %v", err)
	}

	t.Log("Step 9: 外部用户可以读取（通过继承）")
	extPerm, err := docSvc.MyPermission(ctx, external.ID, child.ID)
	if err != nil {
		t.Fatalf("MyPermission(external) error = %v", err)
	}
	if !extPerm.CanRead {
		t.Fatal("external should have read permission through inherit")
	}
	if extPerm.CanEdit {
		t.Fatal("external should NOT have edit")
	}

	t.Log("Step 10: 归档文档")
	err = docSvc.SetDocumentStatus(ctx, userID, child.ID, domain.DocumentStatusArchived)
	if err != nil {
		t.Fatalf("Archive error = %v", err)
	}

	t.Log("全部流程通过 √")
}

func TestSearchUsers(t *testing.T) {
	ctx := context.Background()
	authSvc, _, db := newTestAuthService(t)

	// Create test users
	user1 := domain.User{
		Username:     "alpha_user",
		Email:        "alpha@example.com",
		DisplayName:  "Alpha Test",
		Status:       "active",
		PasswordHash: "hash",
	}
	user2 := domain.User{
		Username:     "beta_user",
		Email:        "beta@example.com",
		DisplayName:  "Beta Test",
		Status:       "active",
		PasswordHash: "hash",
	}
	user3 := domain.User{
		Username:     "disabled_user",
		Email:        "disabled@example.com",
		DisplayName:  "Disabled Test",
		Status:       "disabled",
		PasswordHash: "hash",
	}

	if err := db.Create(&user1).Error; err != nil {
		t.Fatalf("Create user1 error: %v", err)
	}
	if err := db.Create(&user2).Error; err != nil {
		t.Fatalf("Create user2 error: %v", err)
	}
	if err := db.Create(&user3).Error; err != nil {
		t.Fatalf("Create user3 error: %v", err)
	}

	// 1. Search matching username case-insensitively
	res, err := authSvc.SearchUsers(ctx, SearchUsersRequest{Q: "AlPhA"})
	if err != nil {
		t.Fatalf("SearchUsers error: %v", err)
	}
	if len(res) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(res))
	}
	if res[0].Username != "alpha_user" {
		t.Fatalf("Expected alpha_user, got %s", res[0].Username)
	}
	if res[0].Email != "alpha@example.com" {
		t.Fatalf("Expected alpha@example.com, got %s", res[0].Email)
	}

	// 2. Search matching email
	res, err = authSvc.SearchUsers(ctx, SearchUsersRequest{Q: "beta@"})
	if err != nil {
		t.Fatalf("SearchUsers error: %v", err)
	}
	if len(res) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(res))
	}
	if res[0].Username != "beta_user" {
		t.Fatalf("Expected beta_user, got %s", res[0].Username)
	}

	// 3. Search matching multiple (using common keyword like "example.com")
	res, err = authSvc.SearchUsers(ctx, SearchUsersRequest{Q: "example.com"})
	if err != nil {
		t.Fatalf("SearchUsers error: %v", err)
	}
	foundUser1 := false
	foundUser2 := false
	foundUser3 := false
	for _, u := range res {
		if u.ID == user1.ID {
			foundUser1 = true
		}
		if u.ID == user2.ID {
			foundUser2 = true
		}
		if u.ID == user3.ID {
			foundUser3 = true
		}
	}
	if !foundUser1 || !foundUser2 {
		t.Fatal("Expected user1 and user2 to be found in general query")
	}
	if foundUser3 {
		t.Fatal("Disabled user should not be returned by search")
	}

	// 4. Search empty query
	res, err = authSvc.SearchUsers(ctx, SearchUsersRequest{Q: "  "})
	if err != nil {
		t.Fatalf("SearchUsers error: %v", err)
	}
	if len(res) != 0 {
		t.Fatalf("Expected empty results for empty query, got %d", len(res))
	}
}

