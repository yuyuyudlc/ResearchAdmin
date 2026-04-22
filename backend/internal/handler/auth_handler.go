package handler

import (
	"net/http"
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
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	
	// 解析并校验 JSON (Gin 的 binding 标签)
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数格式错误"})
		return
	}

	// 调用业务层，把 Gin 的 Context 
	token, err := h.svc.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		// 这里为了演示简单粗暴返回了401，实际工程应根据 error 类型细分 HTTP 状态码
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "登录成功",
		"token":   token,
	})
}