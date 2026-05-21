package handler

import (
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"research/internal/domain"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

// CreateDocument 创建文档
// @Summary 创建文档
// @Description 在 workspace 下创建文档元数据。根文档要求 workspace 成员权限，子文档要求父文档 EDIT 权限。
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param request body createDocumentRequest true "文档参数"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/documents [post]
func (h *DocumentHandler) CreateDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req createDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	parentID, ok := optionalUUIDParam(c, req.ParentID, "parentId")
	if !ok {
		return
	}

	item, err := h.svc.CreateDocument(c.Request.Context(), service.CreateDocumentRequest{
		UserID:           userID,
		WorkspaceID:      c.Param("workspaceId"),
		ParentID:         parentID,
		Title:            req.Title,
		Summary:          req.Summary,
		DocType:          req.DocType,
		SourceStorageKey: req.SourceStorageKey,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, item)
}

// UploadDocument 上传文件型文档
// @Summary 上传文件型文档
// @Description 创建文件型文档元数据，真实文件存储由后续存储模块接入。
// @Tags documents
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param file formData file true "上传文件"
// @Param parentId formData string false "父文档 ID"
// @Param title formData string false "文档标题"
// @Param summary formData string false "文档摘要"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/documents/upload [post]
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	title := c.PostForm("title")
	summary := c.PostForm("summary")
	parentValue := c.PostForm("parentId")
	var parentID *string
	if parentValue != "" {
		var ok bool
		parentID, ok = optionalUUIDParam(c, &parentValue, "parentId")
		if !ok {
			return
		}
	}
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "缺少上传文件")
		return
	}
	if title == "" {
		title = file.Filename
	}

	src, err := file.Open()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "读取文件失败")
		return
	}
	defer src.Close()
	data, err := io.ReadAll(src)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "读取文件失败")
		return
	}

	item, err := h.svc.CreateDocument(c.Request.Context(), service.CreateDocumentRequest{
		UserID:           userID,
		WorkspaceID:      c.Param("workspaceId"),
		ParentID:         parentID,
		Title:            title,
		Summary:          summary,
		DocType:          domain.DocumentTypeFile,
		SourceStorageKey: file.Filename,
		BodyData:         data,
		BodyType:         inferBodyType(file.Filename),
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, item)
}

// GetDocument 获取文档详情
// @Summary 获取文档详情
// @Description 返回单个文档元数据和当前用户最终权限。
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId} [get]
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	item, err := h.svc.GetDocumentDetail(c.Request.Context(), userID, c.Param("documentId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// UpdateDocument 更新文档元数据
// @Summary 更新文档元数据
// @Description 更新文档元数据，不处理正文内容。
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param request body updateDocumentRequest true "文档更新参数"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId} [patch]
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req updateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	item, err := h.svc.UpdateDocument(c.Request.Context(), service.UpdateDocumentRequest{
		UserID:           userID,
		DocumentID:       c.Param("documentId"),
		Title:            req.Title,
		Summary:          req.Summary,
		SourceStorageKey: req.SourceStorageKey,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// MoveDocument 移动文档
// @Summary 移动文档
// @Description 移动文档到新的父节点并更新排序。
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param request body moveDocumentRequest true "移动参数"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/move [post]
func (h *DocumentHandler) MoveDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req moveDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	parentID, ok := optionalUUIDParam(c, req.ParentID, "parentId")
	if !ok {
		return
	}

	item, err := h.svc.MoveDocument(c.Request.Context(), service.MoveDocumentRequest{
		UserID:     userID,
		DocumentID: c.Param("documentId"),
		ParentID:   parentID,
		SortOrder:  req.SortOrder,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// ArchiveDocument 归档文档
// @Summary 归档文档
// @Description 将文档标记为 archived。
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/archive [post]
func (h *DocumentHandler) ArchiveDocument(c *gin.Context) {
	h.setDocumentStatus(c, domain.DocumentStatusArchived, "归档成功")
}

// RestoreDocument 恢复文档
// @Summary 恢复文档
// @Description 将归档文档恢复为 active。
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/restore [post]
func (h *DocumentHandler) RestoreDocument(c *gin.Context) {
	h.setDocumentStatus(c, domain.DocumentStatusActive, "恢复成功")
}

// DeleteDocument 删除文档
// @Summary 删除文档
// @Description 软删除文档。
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId} [delete]
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	h.setDocumentStatus(c, domain.DocumentStatusDeleted, "删除成功")
}

// DownloadDocument 下载文件型文档
// @Summary 下载文件型文档
// @Description 返回文件型文档的存储引用。
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/download [get]
func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	item, err := h.svc.GetDocumentDetail(c.Request.Context(), userID, c.Param("documentId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	if item.DocType != domain.DocumentTypeFile {
		response.Error(c, http.StatusBadRequest, "只有文件型文档支持下载")
		return
	}
	response.Success(c, gin.H{"sourceStorageKey": item.SourceStorageKey})
}

func inferBodyType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".pdf":
		return domain.BodyTypePdf
	case ".doc", ".docx":
		return domain.BodyTypeWord
	case ".xls", ".xlsx":
		return domain.BodyTypeExcel
	case ".ppt", ".pptx":
		return domain.BodyTypePpt
	case ".mp4", ".mov", ".avi", ".mkv":
		return domain.BodyTypeVideo
	default:
		return domain.BodyTypeYjsState
	}
}

func (h *DocumentHandler) setDocumentStatus(c *gin.Context, status domain.DocumentStatus, message string) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	if err := h.svc.SetDocumentStatus(c.Request.Context(), userID, c.Param("documentId"), status); err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": message})
}
