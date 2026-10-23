import type { Activity } from "@/lib/activities";
import type { AdminQuery } from "@/lib/admin-queries";
import type { MembershipApplication } from "@/lib/membership-shared";
import type { SettingsRecord } from "@/lib/site-settings";

type Status = "draft" | "published" | "archived";
export type PanelData = {
  generatedAt: number;
  query: AdminQuery;
  collection: { total: number; pages: number; page: number; filters: Array<{value: string; label: string}> };
  metrics: { activities: number; publishedPosts: number; otherPosts: number; pendingComments: number; openRequests: number; openMemberships: number; media: number; privateMedia: number };
  settings: SettingsRecord | null;
  assignees: string[];
  activities: Activity[];
  readiness: Array<{ label: string; ready: boolean }>;
  permissions: { content: boolean; moderation: boolean; requests: boolean; audit: boolean; roles: boolean };
  configuration: { commentsEnabled: boolean; contactEnabled: boolean; membershipEnabled: boolean };
  setupPending: boolean;
  posts: Array<{ id: string; slug: string; title: string; excerpt: string; body: string; coverMediaId: string | null; status: Status; createdAt: number; updatedAt: number; publishedAt: number | null }>;
  media: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; altText: string; visibility: "private" | "public"; createdAt: number; updatedAt: number; usedByPublishedPosts: number }>;
  comments: Array<{ id: string; postId: string; postTitle: string; authorName: string; body: string; status: "pending" | "approved" | "rejected"; createdAt: number; retentionUntil: number; moderatedAt: number | null }>;
  memberships: MembershipApplication[];
  requests: Array<{ id: string; kind: "suggestion" | "collaboration" | "citizen_report" | "complaint" | "idea"; name: string | null; email: string | null; phone: string | null; institution: string | null; message: string; detailsJson: string | null; referenceCode: string | null; status: "new" | "in_review" | "closed"; assignedTo: string | null; createdAt: number; updatedAt: number; retentionUntil: number }>;
  roles: Array<{ email: string; role: "admin" | "editor" | "moderator"; createdAt: number; updatedAt: number | null; revokedAt: number | null }>;
  audit: Array<{ id: string; actorEmail: string; action: string; entityType: string; entityId: string; metadataJson: string | null; createdAt: number }>;
};

