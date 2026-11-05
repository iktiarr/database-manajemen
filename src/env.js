/**
 * SvelteKit Environment Variables Declaration with optional fallback schema
 */
const opt = {
	schema: {
		'~standard': {
			version: 1,
			vendor: 'custom',
			validate: (val) => ({ value: val ?? '' })
		}
	}
};

export const variables = {
	ADMIN_DATABASE_URL: opt,
	DATABASE_BASE_URL: opt,
	APP_MASTER_KEY: opt,
	DATABASE_URL: opt,
	DATABASE_URL_UNPOOLED: opt,
	NEON_BRANCH: opt,
	NEON_AUTH_BASE_URL: opt,
	NEON_AUTH_JWKS_URL: opt,
	NEON_REALTIME_URL: opt,
	NEON_REALTIME_SECRET: opt,
	AWS_ACCESS_KEY_ID: opt,
	AWS_SECRET_ACCESS_KEY: opt,
	AWS_ENDPOINT_URL_S3: opt,
	AWS_REGION: opt,
	NEON_FUNCTION_HELLO_BASE_URL: opt
};

