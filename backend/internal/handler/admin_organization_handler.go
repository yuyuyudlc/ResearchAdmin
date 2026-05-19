package handler

import (
	"net/http"

	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

type AdminOrganizationHandler struct {
	svc *service.AdminOrganizationService
}

func NewAdminOrganizationHandler(svc *service.AdminOrganizationService) *AdminOrganizationHandler {
	return &AdminOrganizationHandler{svc: svc}
}

type CreateOrganizationPayload struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateOrganizationPayload struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	SortOrder   *int    `json:"sortOrder"`
}

type MoveOrganizationUsersPayload struct {
	TargetOrgID string `json:"targetOrgId"`
}

// ListOrganizations GET /admin/organizations
func (h *AdminOrganizationHandler) ListOrganizations(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), c.Query("q"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"items": items})
}

// CreateOrganization POST /admin/organizations
func (h *AdminOrganizationHandler) CreateOrganization(c *gin.Context) {
	var req CreateOrganizationPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	org, err := h.svc.Create(c.Request.Context(), service.CreateOrganizationRequest{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, org)
}

// UpdateOrganization PATCH /admin/organizations/:orgId
func (h *AdminOrganizationHandler) UpdateOrganization(c *gin.Context) {
	var req UpdateOrganizationPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	org, err := h.svc.Update(c.Request.Context(), c.Param("orgId"), service.UpdateOrganizationRequest{
		Name:        req.Name,
		Description: req.Description,
		SortOrder:   req.SortOrder,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, org)
}

// DeleteOrganization DELETE /admin/organizations/:orgId
// 查询参数：
//
//	targetOrgId=<uuid>  迁移至指定机构
//	targetOrgId=unassigned  迁移至「未分配」（显式）
//	不传：当机构下仍有成员时返回 409
func (h *AdminOrganizationHandler) DeleteOrganization(c *gin.Context) {
	target := c.Query("targetOrgId")
	req := service.DeleteOrganizationRequest{
		OrgID: c.Param("orgId"),
	}
	if target == "unassigned" {
		req.TargetOrgID = ""
		req.AllowEmptyTarget = true
	} else {
		req.TargetOrgID = target
	}
	if err := h.svc.Delete(c.Request.Context(), req); err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": "已删除"})
}

// MoveAllUsers POST /admin/organizations/:orgId/move-users
// 把指定机构下的所有用户搬到 targetOrgId（空字符串 = 未分配）
func (h *AdminOrganizationHandler) MoveAllUsers(c *gin.Context) {
	var req MoveOrganizationUsersPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	affected, err := h.svc.MoveAll(c.Request.Context(), c.Param("orgId"), req.TargetOrgID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"affected": affected})
}