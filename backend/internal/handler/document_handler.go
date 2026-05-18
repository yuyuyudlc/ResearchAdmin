package handler

import "research/internal/service"

type DocumentHandler struct {
	svc *service.DocumentService
}

// NewDocumentHandler 创建文档与 workspace 相关接口处理器。
func NewDocumentHandler(svc *service.DocumentService) *DocumentHandler {
	return &DocumentHandler{svc: svc}
}
