package handler

import (
	"io"
	"net/http"

	"research/internal/domain"
	"research/internal/response"

	"github.com/gin-gonic/gin"
)

// GetBody 获取文档正文
// @Summary 获取文档正文
// @Description 返回文档的 yjs 状态或文件二进制数据。
// @Tags documents
// @Produce octet-stream
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Success 200 {file} binary
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/body [get]
func (h *DocumentHandler) GetBody(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	body, err := h.svc.GetBody(c.Request.Context(), userID, c.Param("documentId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}

	c.Data(http.StatusOK, "application/octet-stream", body.Data)
}

// PutBody 更新文档正文
// @Summary 更新文档正文
// @Description 上传文档正文（yjs 二进制状态 或 文件）。权限：EDIT。
// @Tags documents
// @Accept octet-stream
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param X-Body-Type header string false "正文类型（yjs_state/pdf/word/video）"
// @Param request body string true "正文二进制"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/body [put]
func (h *DocumentHandler) PutBody(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	data, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "读取正文失败")
		return
	}

	bodyType := c.GetHeader("X-Body-Type")
	if bodyType == "" {
		bodyType = domain.BodyTypeYjsState
	}

	if err := h.svc.PutBody(c.Request.Context(), userID, c.Param("documentId"), bodyType, data); err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"size": len(data)})
}
