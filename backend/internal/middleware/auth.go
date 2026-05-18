package middleware

import (
	"net/http"
	"strings"

	"research/internal/auth"
	"research/internal/response"

	"github.com/gin-gonic/gin"
)

const currentUserIDKey = "current_user_id"

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
