package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"research/internal/middleware"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

func currentUserID(c *gin.Context) (string, bool) {
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "未登录")
		return "", false
	}
	return userID, true
}

func respondServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		response.Error(c, http.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrNotFound):
		response.Error(c, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrConflict):
		response.Error(c, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrInvalidArgument), errors.Is(err, service.ErrLastWorkspaceOwner):
		response.Error(c, http.StatusBadRequest, err.Error())
	default:
		response.Error(c, http.StatusInternalServerError, err.Error())
	}
}

func parseLimit(value string) int {
	limit := 50
	_, _ = fmt.Sscanf(value, "%d", &limit)
	return limit
}

func optionalUUIDParam(c *gin.Context, value *string, field string) (*string, bool) {
	if value == nil {
		return nil, true
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, true
	}
	if !isUUIDLike(trimmed) {
		response.Error(c, http.StatusBadRequest, field+" 格式错误")
		return nil, false
	}
	return &trimmed, true
}

func isUUIDLike(value string) bool {
	if len(value) != 36 {
		return false
	}
	for i, r := range value {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			if !isHex(r) {
				return false
			}
		}
	}
	return true
}

func isHex(r rune) bool {
	return (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')
}
