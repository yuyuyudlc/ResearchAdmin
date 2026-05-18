package handler

import (
	"net/http"

	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

// ListMembers 获取 Workspace 成员列表
// @Summary 获取 Workspace 成员列表
// @Description 返回 workspace 当前成员列表。
// @Tags workspace-members
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/members [get]
func (h *DocumentHandler) ListMembers(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	items, err := h.svc.ListMembers(c.Request.Context(), userID, c.Param("workspaceId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"items": items})
}

// AddMember 添加 Workspace 成员
// @Summary 添加 Workspace 成员
// @Description 向 workspace 添加成员，仅 workspace owner 可操作。
// @Tags workspace-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param request body memberRequest true "成员参数"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/members [post]
func (h *DocumentHandler) AddMember(c *gin.Context) {
	operatorID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req memberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	item, err := h.svc.AddMember(c.Request.Context(), service.UpsertWorkspaceMemberRequest{
		OperatorUserID: operatorID,
		WorkspaceID:    c.Param("workspaceId"),
		UserID:         req.UserID,
		Role:           req.Role,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, item)
}

// UpdateMember 修改 Workspace 成员角色
// @Summary 修改 Workspace 成员角色
// @Description 修改 workspace 成员角色，并保护最后一个 owner。
// @Tags workspace-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param userId path string true "用户 ID"
// @Param request body updateMemberRequest true "成员角色参数"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/members/{userId} [patch]
func (h *DocumentHandler) UpdateMember(c *gin.Context) {
	operatorID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req updateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	item, err := h.svc.UpdateMember(c.Request.Context(), service.UpsertWorkspaceMemberRequest{
		OperatorUserID: operatorID,
		WorkspaceID:    c.Param("workspaceId"),
		UserID:         c.Param("userId"),
		Role:           req.Role,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// RemoveMember 移除 Workspace 成员
// @Summary 移除 Workspace 成员
// @Description 移除 workspace 成员，并保护最后一个 owner。
// @Tags workspace-members
// @Produce json
// @Security BearerAuth
// @Param workspaceId path string true "Workspace ID"
// @Param userId path string true "用户 ID"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /workspaces/{workspaceId}/members/{userId} [delete]
func (h *DocumentHandler) RemoveMember(c *gin.Context) {
	operatorID, ok := currentUserID(c)
	if !ok {
		return
	}
	err := h.svc.RemoveMember(c.Request.Context(), operatorID, c.Param("workspaceId"), c.Param("userId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": "移除成功"})
}
