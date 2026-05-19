package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"research/internal/domain"
)

// AdminOrganizationService 管理员机构管理
type AdminOrganizationService struct {
	orgRepo  domain.OrganizationRepository
	userRepo domain.UserRepository
}

func NewAdminOrganizationService(orgRepo domain.OrganizationRepository, userRepo domain.UserRepository) *AdminOrganizationService {
	return &AdminOrganizationService{orgRepo: orgRepo, userRepo: userRepo}
}

type CreateOrganizationRequest struct {
	Name        string
	Description string
}

type UpdateOrganizationRequest struct {
	Name        *string
	Description *string
	SortOrder   *int
}

// DeleteOrganizationRequest 删除机构入参
// TargetOrgID: 若机构下仍有用户，必须指定迁移目标。空字符串表示「未分配（NULL）」。
// AllowEmptyTarget: 显式选择「未分配」时设为 true，避免与未传值（""）混淆。
type DeleteOrganizationRequest struct {
	OrgID            string
	TargetOrgID      string
	AllowEmptyTarget bool
}

func (s *AdminOrganizationService) List(ctx context.Context, q string) ([]domain.OrganizationDetail, error) {
	return s.orgRepo.List(ctx, q)
}

func (s *AdminOrganizationService) Get(ctx context.Context, id string) (*domain.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}

func (s *AdminOrganizationService) Create(ctx context.Context, req CreateOrganizationRequest) (*domain.Organization, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("%w: 机构名称不能为空", ErrInvalidArgument)
	}
	// 名称唯一
	existing, err := s.orgRepo.GetByName(ctx, name)
	if err != nil && !errors.Is(err, domain.ErrOrganizationNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("%w: 机构名称已存在", ErrConflict)
	}

	org := &domain.Organization{
		Name:        name,
		Description: strings.TrimSpace(req.Description),
	}
	if err := s.orgRepo.Create(ctx, org); err != nil {
		return nil, err
	}
	return org, nil
}

func (s *AdminOrganizationService) Update(ctx context.Context, id string, req UpdateOrganizationRequest) (*domain.Organization, error) {
	org, err := s.orgRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldName := org.Name
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("%w: 机构名称不能为空", ErrInvalidArgument)
		}
		if name != org.Name {
			// 唯一性校验
			if dup, err := s.orgRepo.GetByName(ctx, name); err != nil && !errors.Is(err, domain.ErrOrganizationNotFound) {
				return nil, err
			} else if dup != nil {
				return nil, fmt.Errorf("%w: 机构名称已存在", ErrConflict)
			}
		}
		org.Name = name
	}
	if req.Description != nil {
		org.Description = strings.TrimSpace(*req.Description)
	}
	if req.SortOrder != nil {
		org.SortOrder = *req.SortOrder
	}

	if err := s.orgRepo.Update(ctx, org); err != nil {
		return nil, err
	}

	// 改名时同步刷新冗余字段
	if oldName != org.Name {
		if _, err := s.userRepo.MoveAllByOrganization(ctx, org.ID, &org.ID, org.Name); err != nil {
			return nil, err
		}
	}
	return org, nil
}

// Delete 删除机构。仍有用户时必须提供迁移目标。
func (s *AdminOrganizationService) Delete(ctx context.Context, req DeleteOrganizationRequest) error {
	org, err := s.orgRepo.GetByID(ctx, req.OrgID)
	if err != nil {
		return err
	}
	count, err := s.orgRepo.CountUsers(ctx, org.ID)
	if err != nil {
		return err
	}
	if count > 0 {
		var targetID *string
		var targetName string
		if req.TargetOrgID == "" {
			if !req.AllowEmptyTarget {
				return fmt.Errorf("%w: 机构下仍有 %d 名成员，请先选择迁移目标", ErrConflict, count)
			}
			targetID = nil
			targetName = ""
		} else {
			if req.TargetOrgID == org.ID {
				return fmt.Errorf("%w: 迁移目标不能是当前机构", ErrInvalidArgument)
			}
			target, err := s.orgRepo.GetByID(ctx, req.TargetOrgID)
			if err != nil {
				return err
			}
			tid := target.ID
			targetID = &tid
			targetName = target.Name
		}
		if _, err := s.userRepo.MoveAllByOrganization(ctx, org.ID, targetID, targetName); err != nil {
			return err
		}
	}
	return s.orgRepo.Delete(ctx, org.ID)
}

// MoveAll 将 fromOrgID 下全部用户迁到 toOrgID（toOrgID 空串=未分配）
func (s *AdminOrganizationService) MoveAll(ctx context.Context, fromOrgID, toOrgID string) (int64, error) {
	from, err := s.orgRepo.GetByID(ctx, fromOrgID)
	if err != nil {
		return 0, err
	}
	if toOrgID == "" {
		return s.userRepo.MoveAllByOrganization(ctx, from.ID, nil, "")
	}
	if toOrgID == from.ID {
		return 0, fmt.Errorf("%w: 迁移目标不能是当前机构", ErrInvalidArgument)
	}
	to, err := s.orgRepo.GetByID(ctx, toOrgID)
	if err != nil {
		return 0, err
	}
	tid := to.ID
	return s.userRepo.MoveAllByOrganization(ctx, from.ID, &tid, to.Name)
}