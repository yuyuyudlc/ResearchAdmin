package requestcontext

import "context"

type contextKey string

const internalRequestKey contextKey = "internal_request"

func WithInternalRequest(ctx context.Context) context.Context {
	return context.WithValue(ctx, internalRequestKey, true)
}

func IsInternalRequest(ctx context.Context) bool {
	value := ctx.Value(internalRequestKey)
	flag, ok := value.(bool)
	return ok && flag
}
