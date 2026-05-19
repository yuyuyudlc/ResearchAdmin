package middleware

import (
	"net/http"
	"strings"

	"research/internal/auth"
	"research/internal/response"

	"github.com/gin-gonic/gin"
)

const (
	currentUserIDKey       = "current_user_id"
	currentUsernameKey     = "current_username"
	adminUsername          = "admin"
)

func JWTAuth(tokenManager *auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, http.StatusUnauthorized, "缺少 Authorization 头")
			c.Abort()
			return
		}

		parts := strings.Fields(authHeader)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(c, http.StatusUnauthorized, "Authorization 格式错误")
			c.Abort()
			return
		}

		claims, err := tokenManager.Parse(parts[1])
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "无效或已过期的 token")
			c.Abort()
			return
		}

		c.Set(currentUserIDKey, claims.UserID)
		c.Set(currentUsernameKey, claims.Username)
		c.Next()
	}
}

// AdminOnly 限制只有 username == "admin" 的用户可以访问。
// 必须在 JWTAuth 之后挂载。
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		username, _ := CurrentUsername(c)
		if username != adminUsername {
			response.Error(c, http.StatusForbidden, "仅管理员可操作")
			c.Abort()
			return
		}
		c.Next()
	}
}

func CurrentUserID(c *gin.Context) (string, bool) {
	userID, ok := c.Get(currentUserIDKey)
	if !ok {
		return "", false
	}
	value, ok := userID.(string)
	return value, ok
}

func CurrentUsername(c *gin.Context) (string, bool) {
	username, ok := c.Get(currentUsernameKey)
	if !ok {
		return "", false
	}
	value, ok := username.(string)
	return value, ok
}
