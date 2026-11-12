export type SiteRuntimeEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_EMAILS?: string;
  OWNER_ACCOUNT_EMAIL?: string;
  OWNER_SETUP_HASH?: string;
  OWNER_SETUP_EXPIRES_AT?: string;
  CONTACT_ENABLED?: string;
  COMMENTS_ENABLED?: string;
  MEMBERSHIP_ENABLED?: string;
  MEMBERSHIP_RETENTION_DAYS?: string;
  MEMBERSHIP_NOTICE_APPROVED?: string;
  MEMBERSHIP_DIRECT_CONSENT?: string;
  DATA_CONTROLLER_REGIME?: string;
  DATA_CONTROLLER_LEGAL_BASIS?: string;
  TRANSPARENCY_ADDRESS?: string;
  RIGHTS_PROCEDURE?: string;
  DATA_CONTROLLER_NAME?: string;
  DATA_CONTROLLER_ADDRESS?: string;
  ARCO_EMAIL?: string;
  PRIVACY_NOTICE_VERSION?: string;
  CONTACT_RETENTION_DAYS?: string;
  COMMENTS_RETENTION_DAYS?: string;
  RATE_LIMIT_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  REGISTRATION_TURNSTILE_SITE_KEY?: string;
  REGISTRATION_TURNSTILE_SECRET_KEY?: string;
  REGISTRATION_TURNSTILE_HOSTNAME?: string;
  RESEND_API_KEY?: string;
  REGISTRATION_EMAIL_FROM?: string;
  REGISTRATION_PUBLIC_ORIGIN?: string;
  IMAGES?: ImagesBinding;
  SOCIAL_INSTAGRAM?: string;
  SOCIAL_FACEBOOK?: string;
  SOCIAL_X?: string;
  SOCIAL_YOUTUBE?: string;
  SOCIAL_WHATSAPP?: string;
};

declare global {
  var __ACTION_JUVENIL_SITE_ENV__: SiteRuntimeEnv | undefined;
}

export function getRuntimeEnv(): SiteRuntimeEnv {
  return globalThis.__ACTION_JUVENIL_SITE_ENV__ ?? {};
}
