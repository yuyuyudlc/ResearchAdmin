package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"research/internal/domain"
	"research/internal/response"
	"research/internal/service"

	"github.com/gin-gonic/gin"
)

type spreadsheetBlockUpdatePayload struct {
	Title        *string                    `json:"title"`
	Mode         *domain.SpreadsheetMode    `json:"mode"`
	Config       *domain.SpreadsheetConfig  `json:"config"`
	Filters      []domain.SpreadsheetFilter `json:"filters"`
	Sort         *domain.SpreadsheetSort    `json:"sort"`
	ActiveMetric spreadsheetNullableString  `json:"activeMetric"`
}

type spreadsheetCellUpdatePayload struct {
	RowIndex int    `json:"rowIndex"`
	Field    string `json:"field"`
	Value    any    `json:"value"`
}

type spreadsheetCreateRecordPayload struct {
	Record map[string]any `json:"record"`
}

type spreadsheetNullableString struct {
	Value *string
	Set   bool
}

func (n *spreadsheetNullableString) UnmarshalJSON(data []byte) error {
	n.Set = true
	if string(data) == "null" {
		n.Value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	n.Value = &value
	return nil
}

// GetSpreadsheetBlock 获取或初始化多维表格 block
// @Summary 获取或初始化多维表格 block
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId} [get]
func (h *DocumentHandler) GetSpreadsheetBlock(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	block, err := h.svc.GetSpreadsheetBlock(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, block)
}

// UpdateSpreadsheetBlock 更新多维表格视图配置
// @Summary 更新多维表格视图配置
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Param request body spreadsheetBlockUpdatePayload true "更新内容"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId} [patch]
func (h *DocumentHandler) UpdateSpreadsheetBlock(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	var payload spreadsheetBlockUpdatePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数错误")
		return
	}

	req := service.UpdateSpreadsheetBlockRequest{
		Title:   payload.Title,
		Mode:    payload.Mode,
		Config:  payload.Config,
		Filters: payload.Filters,
		Sort:    payload.Sort,
	}
	if payload.ActiveMetric.Set {
		req.ClearMetric = payload.ActiveMetric.Value == nil
		req.ActiveMetric = payload.ActiveMetric.Value
	}

	block, err := h.svc.UpdateSpreadsheetBlock(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"), req)
	if err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, block)
}

// UpdateSpreadsheetCell 更新表格中的单元格
// @Summary 更新表格中的单元格
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Param request body spreadsheetCellUpdatePayload true "单元格更新"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId}/cell [patch]
func (h *DocumentHandler) UpdateSpreadsheetCell(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	var payload spreadsheetCellUpdatePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.Error(c, http.StatusBadRequest, "请求参数错误")
		return
	}

	block, err := h.svc.UpdateSpreadsheetCell(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"), service.UpdateSpreadsheetCellRequest{
		RowIndex: payload.RowIndex,
		Field:    payload.Field,
		Value:    payload.Value,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, block)
}

// CreateSpreadsheetRecord 新增一条多维表格记录
// @Summary 新增一条多维表格记录
// @Tags documents
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Param request body spreadsheetCreateRecordPayload false "可选的初始字段值"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId}/records [post]
func (h *DocumentHandler) CreateSpreadsheetRecord(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	var payload spreadsheetCreateRecordPayload
	if err := c.ShouldBindJSON(&payload); err != nil && err.Error() != "EOF" {
		response.Error(c, http.StatusBadRequest, "请求参数错误")
		return
	}

	block, err := h.svc.CreateSpreadsheetRecord(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"), service.CreateSpreadsheetRecordRequest{
		Record: payload.Record,
	})
	if err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, block)
}

// GetSpreadsheetBody 获取多维表格快照正文
// @Summary 获取多维表格快照正文
// @Tags documents
// @Produce octet-stream
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Success 200 {file} binary
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId}/body [get]
func (h *DocumentHandler) GetSpreadsheetBody(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	data, err := h.svc.GetSpreadsheetBody(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}

	c.Data(http.StatusOK, "application/octet-stream", data)
}

// PutSpreadsheetBody 更新多维表格快照正文
// @Summary 更新多维表格快照正文
// @Tags documents
// @Accept octet-stream
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Param request body string true "正文二进制"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId}/body [put]
func (h *DocumentHandler) PutSpreadsheetBody(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	data, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "读取正文失败")
		return
	}

	if err := h.svc.PutSpreadsheetBody(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"), data); err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"size": len(data)})
}

// ExportSpreadsheetBlock 导出当前视图数据
// @Summary 导出当前视图数据
// @Tags documents
// @Produce json
// @Security BearerAuth
// @Param documentId path string true "文档 ID"
// @Param blockId path string true "表格 block ID"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /documents/{documentId}/spreadsheets/{blockId}/export [get]
func (h *DocumentHandler) ExportSpreadsheetBlock(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	export, err := h.svc.ExportSpreadsheetBlock(c.Request.Context(), userID, c.Param("documentId"), c.Param("blockId"))
	if err != nil {
		respondServiceError(c, err)
		return
	}

	response.Success(c, export)
}
