package handler

import (
	"net/http"

	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

// ListACL 获取文档 ACL
// @Summary 获取文档 ACL
// @Description 返回文档上显式配置的 ACL 规则，不包含 workspace 默认权限。
// @Tags document-acl
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/acl [get]
func (h *DocumentHandler) ListACL(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	items, err := h.svc.ListACL(c.Request.Context(), userID, c.Param("documentId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"items": items})
}

// CreateACL 新增文档 ACL
// @Summary 新增文档 ACL
// @Description 为文档新增一条 ACL 规则。
// @Tags document-acl
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param request body createACLRequest true "ACL 参数"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/acl [post]
func (h *DocumentHandler) CreateACL(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req createACLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	item, err := h.svc.CreateACL(c.Request.Context(), service.CreateACLRequest{
		UserID:        userID,
		DocumentID:    c.Param("documentId"),
		SubjectType:   req.SubjectType,
		SubjectID:     req.SubjectID,
		PermissionBit: req.PermissionBit,
		Inherit:       req.Inherit,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, item)
}

// UpdateACL 更新文档 ACL
// @Summary 更新文档 ACL
// @Description 更新文档上的指定 ACL 规则。
// @Tags document-acl
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param aclId path string true "ACL ID"
// @Param request body updateACLRequest true "ACL 更新参数"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/acl/{aclId} [patch]
func (h *DocumentHandler) UpdateACL(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var req updateACLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	item, err := h.svc.UpdateACL(c.Request.Context(), service.UpdateACLRequest{
		UserID:        userID,
		DocumentID:    c.Param("documentId"),
		ACLID:         c.Param("aclId"),
		PermissionBit: req.PermissionBit,
		Inherit:       req.Inherit,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// DeleteACL 删除文档 ACL
// @Summary 删除文档 ACL
// @Description 删除文档上的指定 ACL 规则。
// @Tags document-acl
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param aclId path string true "ACL ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/acl/{aclId} [delete]
func (h *DocumentHandler) DeleteACL(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	err := h.svc.DeleteACL(c.Request.Context(), userID, c.Param("documentId"), c.Param("aclId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// MyPermission 获取我的文档权限
// @Summary 获取我的文档权限
// @Description 返回当前用户对文档的最终权限位。
// @Tags document-acl
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/my-permission [get]
func (h *DocumentHandler) MyPermission(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	result, err := h.svc.MyPermission(c.Request.Context(), userID, c.Param("documentId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, result)
}
