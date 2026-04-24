package handler

import (
	"errors"
	"net/http"

	"research/internal/domain"
	"research/internal/middleware"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// 接收前端 payload 的结构体
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username          string                   `json:"username" binding:"required"`
	Email             string                   `json:"email" binding:"required,email"`
	Password          string                   `json:"password" binding:"required"`
	Organization      string                   `json:"organization"`
	AvatarURL         string                   `json:"avatar_url"`
	Signature         string                   `json:"signature"`
	ProfessionalTitle domain.ProfessionalTitle `json:"professional_title"`
	Supervisor        string                   `json:"supervisor"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type UpdateProfileRequest struct {
	Username          string                   `json:"username" binding:"required"`
	Email             string                   `json:"email" binding:"required,email"`
	Organization      string                   `json:"organization"`
	AvatarURL         string                   `json:"avatar_url"`
	Signature         string                   `json:"signature"`
	ProfessionalTitle domain.ProfessionalTitle `json:"professional_title"`
	Supervisor        string                   `json:"supervisor"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	// 解析并校验 JSON (Gin 的 binding 标签)
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	// 调用业务层，把 Gin 的 Context
	result, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		// 这里为了演示简单粗暴返回了401，实际工程应根据 error 类型细分 HTTP 状态码
		response.Error(c, http.StatusUnauthorized, err.Error())
		return
	}

	response.Success(c, result)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	err := h.svc.Register(c.Request.Context(), service.RegisterRequest{
		Username:          req.Username,
		Email:             req.Email,
		Password:          req.Password,
		Organization:      req.Organization,
		AvatarURL:         req.AvatarURL,
		Signature:         req.Signature,
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        req.Supervisor,
	})
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Created(c, gin.H{"message": "注册成功"})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	err := h.svc.ChangePassword(c.Request.Context(), service.ChangePasswordRequest{
		UserID:      userID,
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		response.Error(c, statusFromError(err), err.Error())
		return
	}

	response.Success(c, gin.H{"message": "密码修改成功"})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	err := h.svc.UpdateProfile(c.Request.Context(), service.UpdateProfileRequest{
		UserID:            userID,
		Username:          req.Username,
		Email:             req.Email,
		Organization:      req.Organization,
		AvatarURL:         req.AvatarURL,
		Signature:         req.Signature,
		ProfessionalTitle: req.ProfessionalTitle,
		Supervisor:        req.Supervisor,
	})
	if err != nil {
		response.Error(c, statusFromError(err), err.Error())
		return
	}

	response.Success(c, gin.H{"message": "个人信息修改成功"})
}

func statusFromError(err error) int {
	if errors.Is(err, domain.ErrUserNotFound) {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}
