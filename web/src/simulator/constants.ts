export const STORAGE_KEY = "suomifi-integration-starter.identity-explorer.v1";

export const STORAGE_VERSION = 1;

export const MAX_RUNS = 20;

export const PLACEHOLDER_CODE = "DEMO-CODE-NOT-A-CREDENTIAL";

export const PLACEHOLDER_ACCESS_TOKEN = "demo-access-token-not-a-credential";

export const PLACEHOLDER_ID_TOKEN = "id-token-field-not-validated";

export const PLACEHOLDER_RESOURCE_TOKEN =
  "demo-jwt-not-verified.payload-not-signed.signature-not-checked";

export const PROVIDER_ORIGIN = "https://identity-stub.invalid";

export const APP_ORIGIN = "https://app.invalid";

export const REDIRECT_PATH = "/api/v1/auth/callback";

export const TIMEOUT_ILLUSTRATIVE_MS = 10_000;

export const DEFAULT_TIMEOUT_DELAY_MS = 200;

export const REPO_BLOB =
  "https://github.com/karinehei/suomifi-integration-starter/blob/main/";

export function repoFileUrl(path: string): string {
  return REPO_BLOB + path.split("/").map(encodeURIComponent).join("/");
}
