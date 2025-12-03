/**
 * Creative types and interfaces
 */

export type CreativeType = "image" | "story" | "poetry" | "music" | "code" | "character" | "dream" | "other";
export type CreativeVisibility = "private" | "pending_approval" | "shared";

export interface CreativeWork {
  id: number;
  userId: number;
  type: CreativeType;
  title?: string;
  description?: string;
  content?: string;
  metadata?: string;
  isSaved: boolean;
  visibility: CreativeVisibility;
  emotionalState?: string;
  inspiration?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreativeAccessRequest {
  id: number;
  userId: number;
  creativeWorkId: number;
  status: "pending" | "approved" | "rejected" | "deferred";
  rejectionReason?: string;
  deferralUntil?: Date;
  requestedAt: Date;
  respondedAt?: Date;
}

export interface CreativeTag {
  id: number;
  creativeWorkId: number;
  tag: string;
  createdAt: Date;
}

export interface CreativeInsight {
  id: number;
  creativeWorkId: number;
  insight: string;
  theme?: string;
  createdAt: Date;
}
