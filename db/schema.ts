import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    coverMediaId: text("cover_media_id"),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    authorEmail: text("author_email").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    publishedAt: integer("published_at"),
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_status_published_idx").on(table.status, table.publishedAt),
    index("posts_cover_media_idx").on(table.coverMediaId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorEmail: text("author_email").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    noticeVersion: text("notice_version").notNull(),
    consentAt: integer("consent_at").notNull(),
    retentionUntil: integer("retention_until").notNull(),
    createdAt: integer("created_at").notNull(),
    moderatedAt: integer("moderated_at"),
    moderatedBy: text("moderated_by"),
  },
  (table) => [
    index("comments_post_status_idx").on(table.postId, table.status, table.createdAt),
    index("comments_status_created_idx").on(table.status, table.createdAt),
    index("comments_retention_idx").on(table.retentionUntil),
  ],
);

export const contactRequests = sqliteTable(
  "contact_requests",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["suggestion", "collaboration", "citizen_report", "complaint", "idea"] }).notNull(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    institution: text("institution"),
    message: text("message").notNull(),
    detailsJson: text("details_json"),
    referenceCode: text("reference_code"),
    consentAt: integer("consent_at"),
    noticeVersion: text("notice_version").notNull(),
    retentionUntil: integer("retention_until").notNull(),
    status: text("status", { enum: ["new", "in_review", "closed"] }).notNull().default("new"),
    assignedTo: text("assigned_to"),
    updatedAt: integer("updated_at"),
    closedAt: integer("closed_at"),
    handledBy: text("handled_by"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("contact_status_created_idx").on(table.status, table.createdAt),
    index("contact_retention_idx").on(table.retentionUntil),
    uniqueIndex("contact_reference_code_unique").on(table.referenceCode),
  ],
);

export const userRoles = sqliteTable("user_roles", {
  email: text("email").primaryKey(),
  role: text("role", { enum: ["admin", "editor", "moderator"] }).notNull(),
  createdAt: integer("created_at").notNull(),
  createdBy: text("created_by").notNull(),
  updatedAt: integer("updated_at"),
  updatedBy: text("updated_by"),
  revokedAt: integer("revoked_at"),
  revokedBy: text("revoked_by"),
});

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    altText: text("alt_text").notNull(),
    visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [
    uniqueIndex("media_object_key_unique").on(table.objectKey),
    index("media_visibility_idx").on(table.visibility, table.createdAt),
  ],
);

export const mediaUploads = sqliteTable("media_uploads", {
  id: text("id").primaryKey(),
  objectKey: text("object_key").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [uniqueIndex("media_upload_object_key_unique").on(table.objectKey), index("media_upload_expiry_idx").on(table.expiresAt)]);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadataJson: text("metadata_json"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("audit_created_idx").on(table.createdAt),
    index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
  ],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    identityHash: text("identity_hash").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    count: integer("count").notNull().default(1),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("rate_limits_expiry_idx").on(table.expiresAt),
    uniqueIndex("rate_limits_scope_identity_window_unique").on(table.scope, table.identityHash, table.windowStartedAt),
  ],
);

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  registrationUrl: text("registration_url"),
  status: text("status", { enum: ["draft", "published", "cancelled"] }).notNull().default("draft"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [index("activities_status_start_idx").on(table.status, table.startsAt)]);

export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  valuesJson: text("values_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const requestEntries = sqliteTable("request_entries", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => contactRequests.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["note", "response_draft"] }).notNull(),
  body: text("body").notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("request_entries_request_created_idx").on(table.requestId, table.createdAt)]);

export const membershipApplications = sqliteTable("membership_applications", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  commission: text("commission").notNull(),
  note: text("note").notNull().default(""),
  profileJson: text("profile_json").notNull().default("{}"),
  referenceCode: text("reference_code").notNull(),
  status: text("status", { enum: ["submitted", "in_review", "accepted", "closed", "withdrawn"] }).notNull().default("submitted"),
  noticeVersion: text("notice_version").notNull(),
  noticeSnapshot: text("notice_snapshot").notNull(),
  consentText: text("consent_text").notNull(),
  consentAt: integer("consent_at").notNull(),
  adultSelfDeclared: integer("adult_self_declared", { mode: "boolean" }).notNull(),
  retentionUntil: integer("retention_until").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [
  uniqueIndex("membership_reference_unique").on(table.referenceCode),
  uniqueIndex("membership_active_owner_unique").on(table.ownerEmail).where(sql`${table.status} IN ('submitted','in_review','accepted')`),
  index("membership_owner_created_idx").on(table.ownerEmail, table.createdAt),
  index("membership_status_created_idx").on(table.status, table.createdAt),
  index("membership_retention_idx").on(table.retentionUntil),
]);

export const membershipEvents = sqliteTable("membership_events", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull().references(() => membershipApplications.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["submitted", "updated", "status", "response", "note", "withdrawn"] }).notNull(),
  body: text("body").notNull(),
  actorType: text("actor_type", { enum: ["applicant", "admin"] }).notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("membership_events_application_idx").on(table.applicationId, table.createdAt)]);

export const staffAccounts = sqliteTable("staff_accounts", {
  registrationNotice: text("registration_notice"),
  registrationConsentAt: integer("registration_consent_at"),
  selfRegistered: integer("self_registered", { mode: "boolean" }).notNull().default(false),
  username: text("username"),
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  credentialVersion: integer("credential_version").notNull().default(1),
  activationHash: text("activation_hash"),
  activationExpiresAt: integer("activation_expires_at"),
  disabledAt: integer("disabled_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [uniqueIndex("staff_email_unique").on(table.email), uniqueIndex("staff_username_unique").on(table.username), uniqueIndex("staff_activation_unique").on(table.activationHash)]);

export const staffSessions = sqliteTable("staff_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id").notNull().references(() => staffAccounts.id, { onDelete: "cascade" }),
  credentialVersion: integer("credential_version").notNull(),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("staff_sessions_account_idx").on(table.accountId), index("staff_sessions_expiry_idx").on(table.expiresAt)]);

export const commissionMembers = sqliteTable("commission_members", {
 id: text("id").primaryKey(), accountId: text("account_id").notNull().references(()=>staffAccounts.id),
 commission: text("commission").notNull(), role: text("role").notNull().default("member"),
 active: integer("active").notNull().default(1), updatedAt: integer("updated_at").notNull(), updatedBy: text("updated_by").notNull(),
},t=>[uniqueIndex("commission_member_unique").on(t.accountId,t.commission)]);
export const commissionItems = sqliteTable("commission_items", {
 id:text("id").primaryKey(), ownerId:text("owner_id").notNull().references(()=>staffAccounts.id), commission:text("commission").notNull(),
 kind:text("kind").notNull(), title:text("title").notNull(), detailsJson:text("details_json").notNull(), status:text("status").notNull().default("draft"),
 venue:text("venue").notNull().default(""), startsAt:integer("starts_at"), endsAt:integer("ends_at"), spaceConfirmed:integer("space_confirmed").notNull().default(0),
 createdAt:integer("created_at").notNull(), updatedAt:integer("updated_at").notNull(), retentionUntil:integer("retention_until").notNull(),
},t=>[index("commission_items_area_idx").on(t.commission,t.updatedAt),index("commission_items_expiry_idx").on(t.retentionUntil)]);
export const commissionMessages = sqliteTable("commission_messages", {
 id:text("id").primaryKey(),itemId:text("item_id").notNull().references(()=>commissionItems.id,{onDelete:"cascade"}),
 authorId:text("author_id").notNull().references(()=>staffAccounts.id),body:text("body").notNull(),createdAt:integer("created_at").notNull(),
},t=>[index("commission_messages_item_idx").on(t.itemId,t.createdAt)]);
export const commissionDocuments = sqliteTable("commission_documents", {
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>staffAccounts.id),itemId:text("item_id"),
 category:text("category").notNull(),objectKey:text("object_key").notNull(),name:text("name").notNull(),mime:text("mime").notNull(),size:integer("size").notNull(),
 status:text("status").notNull().default("received"),reviewNote:text("review_note").notNull().default(""),reviewedBy:text("reviewed_by"),
 noticeSnapshot:text("notice_snapshot").notNull(),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),retentionUntil:integer("retention_until").notNull(),
},t=>[index("commission_documents_owner_idx").on(t.ownerId,t.category),index("commission_documents_expiry_idx").on(t.retentionUntil)]);
export const commissionAffiliations = sqliteTable("commission_affiliations", {
 accountId:text("account_id").primaryKey().references(()=>staffAccounts.id),folio:text("folio").notNull().default(""),
 status:text("status").notNull().default("reported"),note:text("note").notNull().default(""),verificationSource:text("verification_source").notNull().default(""),
 reviewedBy:text("reviewed_by"),verifiedAt:integer("verified_at"),verifiedDocumentId:text("verified_document_id"),updatedAt:integer("updated_at").notNull(),retentionUntil:integer("retention_until").notNull(),
});
export const workspaceConsents = sqliteTable("workspace_consents", {
 id:text("id").primaryKey(),
 accountId:text("account_id").notNull().references(()=>staffAccounts.id),version:text("version").notNull(),snapshot:text("snapshot").notNull(),acceptedAt:integer("accepted_at").notNull(),
});
