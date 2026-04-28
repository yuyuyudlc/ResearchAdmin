package handler

import (
	"net/http"

	"research/internal/domain"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

// CreateWorkspace 创建 Workspace
// @Summary 创建 Workspace
// @Description 创建 workspace，并把当前登录用户设置为 owner。
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body createWorkspaceRequest true "Workspace 参数"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /workspaces [post]
func (h *DocumentHandler) CreateWorkspace(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req createWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	result, err := h.svc.CreateWorkspace(c.Request.Context(), service.CreateWorkspaceRequest{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, result)
}

// ListWorkspaces 获取 Workspace 列表
// @Summary 获取 Workspace 列表
// @Description 返回当前登录用户加入的 workspace 列表。
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /workspaces [get]
func (h *DocumentHandler) ListWorkspaces(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	items, err := h.svc.ListWorkspaces(c.Request.Context(), userID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"items": items})
}

// GetWorkspaceDirectory 获取 Workspace 目录子节点
// @Summary 获取 Workspace 目录子节点
// @Description 返回 workspace 根目录或指定父文档的一层直接子节点，并按当前用户权限过滤。
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param parentId query string false "父文档 ID"
// @Param status query string false "文档状态"
// @Param limit query int false "返回数量"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId} [get]
func (h *DocumentHandler) GetWorkspaceDirectory(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	var parentID *string
	if value := c.Query("parentId"); value != "" {
		parentID = &value
	}
	status := domain.DocumentStatus(c.DefaultQuery("status", string(domain.DocumentStatusActive)))
	limit := parseLimit(c.DefaultQuery("limit", "50"))

	result, err := h.svc.GetWorkspaceDirectory(c.Request.Context(), userID, c.Param("workspaceId"), parentID, status, limit)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, result)
}

// UpdateWorkspace 更新 Workspace
// @Summary 更新 Workspace
// @Description 更新 workspace 元数据，仅 workspace owner 可操作。
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param request body updateWorkspaceRequest true "Workspace 更新参数"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId} [patch]
func (h *DocumentHandler) UpdateWorkspace(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req updateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	result, err := h.svc.UpdateWorkspace(c.Request.Context(), service.UpdateWorkspaceRequest{
		UserID:      userID,
		WorkspaceID: c.Param("workspaceId"),
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, result)
}

// DeleteWorkspace 删除 Workspace
// @Summary 删除 Workspace
// @Description 软删除 workspace，仅 workspace owner 可操作。
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId} [delete]
func (h *DocumentHandler) DeleteWorkspace(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	if err := h.svc.DeleteWorkspace(c.Request.Context(), userID, c.Param("workspaceId")); err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}
