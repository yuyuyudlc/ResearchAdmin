package service

import (
	"errors"

	"research/internal/domain"

	"gorm.io/gorm"
)

var (
	ErrNotFound           = errors.New("资源不存在")
	ErrForbidden          = errors.New("无权限")
	ErrConflict           = errors.New("资源冲突")
	ErrInvalidArgument    = errors.New("请求参数错误")
	ErrLastWorkspaceOwner = errors.New("不能移除或降级最后一个 workspace owner")
)

const fullPermission = domain.PermissionRead | domain.PermissionEdit | domain.PermissionManage

type DocumentService struct {
	db *gorm.DB
}

func NewDocumentService(db *gorm.DB) *DocumentService {
	return &DocumentService{db: db}
}
