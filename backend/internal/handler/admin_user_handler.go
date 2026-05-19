package handler

import (
	"net/http"
	"strconv"
	"strings"

	"research/internal/domain"
	"research/internal/middleware"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

type AdminUserHandler struct {
	svc *service.AdminUserService
}

func NewAdminUserHandler(svc *service.AdminUserService) *AdminUserHandler {
	return &AdminUserHandler{svc: svc}
}

// AdminCreateUserPayload 创建账号请求体。密码硬编码 DefaultInitialPassword。
type AdminCreateUserPayload struct {
	Username          string                   `json:"username" binding:"required"`
	Email             string                   `json:"email" binding:"required,email"`
	OrganizationID    *string                  `json:"organizationId"`
	ProfessionalTitle domain.ProfessionalTitle `json:"professionalTitle"`
	Supervisor        string                   `json:"supervisor"`
}

// AdminUpdateUserPayload 修改用户基础信息。所有字段可选，nil 表示不变。
type AdminUpdateUserPayload struct {
	Username          *string                   `json:"username"`
	Email             *string                   `json:"email"`
	ProfessionalTitle *domain.ProfessionalTitle `json:"professionalTitle"`
	Supervisor        *string                   `json:"supervisor"`
	Signature         *string                   `json:"signature"`
	AvatarURL         *string                   `json:"avatarUrl"`
}

type AdminMoveUserPayload struct {
	OrganizationID *string `json:"organizationId"` // null = 未分配
}

type AdminSetStatusPayload struct {
	Status string `json:"status" binding:"required"`
}

// ListUsers GET /admin/users
func (h *AdminUserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))

	req := service.AdminListUsersRequest{
		Q:        c.Query("q"),
		Page:     page,
		PageSize: pageSize,
	}
	// organizationId 处理：
	// - 缺省：列出所有用户（不按机构筛）
	// - "null" / "unassigned"：未分配
	// - 实际 UUID：按机构筛
	if v, exists := c.GetQuery("organizationId"); exists {
		v = strings.TrimSpace(v)
		switch v {
		case "", "null", "unassigned":
			req.IncludeUnassigned = true
		default:
			req.OrganizationID = &v
		}
	}

	result, err := h.svc.ListUsers(c.Request.Context(), req)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, result)
}

// GetUser GET /admin/users/:userId
func (h *AdminUserHandler) GetUser(c *gin.Context) {
	user, err := h.svc.GetUser(c.Request.Context(), c.Param("userId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, user)
}

// CreateUser POST /admin/users
func (h *AdminUserHandler) CreateUser(c *gin.Context) {
	var req AdminCreateUserPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	result, err := h.svc.CreateUser(c.Request.Context(), service.AdminCreateUserRequest{
		Username:          req.Username,
		Email:             req.Email,
		OrganizationID:    req.OrganizationID,
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        req.Supervisor,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Created(c, result)
}

// UpdateUser PATCH /admin/users/:userId
func (h *AdminUserHandler) UpdateUser(c *gin.Context) {
	var req AdminUpdateUserPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	user, err := h.svc.UpdateUser(c.Request.Context(), c.Param("userId"), service.AdminUpdateUserRequest{
		Username:          req.Username,
		Email:             req.Email,
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        req.Supervisor,
		Signature:         req.Signature,
		AvatarURL:         req.AvatarURL,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, user)
}

// MoveUser POST /admin/users/:userId/move
func (h *AdminUserHandler) MoveUser(c *gin.Context) {
	var req AdminMoveUserPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	user, err := h.svc.MoveUser(c.Request.Context(), c.Param("userId"), req.OrganizationID)
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, user)
}

// ResetPassword POST /admin/users/:userId/reset-password
func (h *AdminUserHandler) ResetPassword(c *gin.Context) {
	pwd, err := h.svc.ResetPassword(c.Request.Context(), c.Param("userId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"initialPassword": pwd})
}

// SetStatus POST /admin/users/:userId/status
func (h *AdminUserHandler) SetStatus(c *gin.Context) {
	var req AdminSetStatusPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}
	currentID, _ := middleware.CurrentUserID(c)
	if err := h.svc.SetStatus(c.Request.Context(), c.Param("userId"), req.Status, currentID); err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"status": req.Status})
}

// DeleteUser DELETE /admin/users/:userId
func (h *AdminUserHandler) DeleteUser(c *gin.Context) {
	currentID, _ := middleware.CurrentUserID(c)
	if err := h.svc.DeleteUser(c.Request.Context(), c.Param("userId"), currentID); err != nil {
		respondServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"message": "已删除"})
}