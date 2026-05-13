package service

import (
	"errors"

	"research/internal/domain"
)

var (
	ErrNotFound           = domain.ErrNotFound
	ErrForbidden          = errors.New("无权限")
	ErrConflict           = errors.New("资源冲突")
	ErrInvalidArgument    = errors.New("请求参数错误")
	ErrLastWorkspaceOwner = errors.New("不能移除或降级最后一个 workspace owner")
)

const fullPermission = domain.PermissionRead | domain.PermissionEdit | domain.PermissionManage

type DocumentService struct {
	workspaceRepo      domain.WorkspaceRepository
	workspaceMemberRepo domain.WorkspaceMemberRepository
	documentRepo       domain.DocumentRepository
	docACLRepo         domain.DocACLRepository
	userRepo           domain.UserRepository
}

func NewDocumentService(
	workspaceRepo domain.WorkspaceRepository,
	workspaceMemberRepo domain.WorkspaceMemberRepository,
	documentRepo domain.DocumentRepository,
	docACLRepo domain.DocACLRepository,
	userRepo domain.UserRepository,
) *DocumentService {
	return &DocumentService{
		workspaceRepo:      workspaceRepo,
		workspaceMemberRepo: workspaceMemberRepo,
		documentRepo:       documentRepo,
		docACLRepo:         docACLRepo,
		userRepo:           userRepo,
	}
}
