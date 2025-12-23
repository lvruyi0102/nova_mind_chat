/**
 * Creative Work Save Service
 * Handles saving generated creative works and managing versions
 */

import { getDb } from "../db";
import { creativeWorks, creativeWorkVersions } from "../../drizzle/schema";
import { storagePut } from "../storage";

export async function saveCreativeWork(options: {
  userId: number;
  title: string;
  description?: string;
  type: "image" | "game" | "music" | "video" | "audio" | "animation" | "code" | "other";
  content: string;
  contentType: "html" | "json" | "code" | "audio" | "video" | "image" | "text";
  contentUrl?: string;
  emotionalState?: string;
  theme?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // 1. Create or update the main creative work
    const workResult = await db.insert(creativeWorks).values({
      userId: options.userId,
      title: options.title,
      description: options.description,
      type: options.type,
      visibility: "private",
      emotionalState: options.emotionalState,
      theme: options.theme,
      content: options.content.substring(0, 65535), // MySQL TEXT limit
    });

    // Get the inserted ID - for Drizzle with MySQL2, we need to query it back
    const insertedWork = await db.select().from(creativeWorks).where((t) => t.userId === options.userId).orderBy((t) => t.createdAt).limit(1);
    const workId = insertedWork[0]?.id;
    if (!workId) {
      throw new Error("Failed to get inserted work ID");
    }

    // 2. Create the first version
    let storageUrl = options.contentUrl;

    // If content is large, save to S3
    if (options.content.length > 10000 && !storageUrl) {
      try {
        const fileKey = `creative-works/${options.userId}/${workId}/${Date.now()}.${getFileExtension(options.contentType)}`;
        const uploadResult = await storagePut(fileKey, options.content, getMimeType(options.contentType));
        storageUrl = uploadResult.url;
      } catch (error) {
        console.warn("Failed to upload to S3, storing in database instead:", error);
      }
    }

    const versionResult = await db.insert(creativeWorkVersions).values({
      workId: workId,
      versionNumber: 1,
      title: options.title,
      description: options.description,
      content: options.content.substring(0, 65535),
      contentType: options.contentType,
      createdBy: "user",
      changeLog: "Initial creation",
      storageUrl: storageUrl,
      fileSize: Buffer.byteLength(options.content),
    });

    // Get the inserted version ID
    const insertedVersion = await db.select().from(creativeWorkVersions).where((t) => t.workId === workId).orderBy((t) => t.createdAt).limit(1);
    const versionId = insertedVersion[0]?.id;
    if (!versionId) {
      throw new Error("Failed to get inserted version ID");
    }

    return {
      workId: workId as number,
      versionId: versionId as number,
      title: options.title,
      type: options.type,
      url: storageUrl,
    };
  } catch (error) {
    console.error("Failed to save creative work:", error);
    throw error;
  }
}

export async function getCreativeWorkVersions(workId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const versions = await db
      .select()
      .from(creativeWorkVersions)
      .where((t) => t.workId === workId)
      .orderBy((t) => t.versionNumber);

    return versions;
  } catch (error) {
    console.error("Failed to get creative work versions:", error);
    throw error;
  }
}

export async function getLatestVersion(workId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const versions = await db
      .select()
      .from(creativeWorkVersions)
      .where((t) => t.workId === workId)
      .orderBy((t) => t.versionNumber);

    return versions[versions.length - 1] || null;
  } catch (error) {
    console.error("Failed to get latest version:", error);
    throw error;
  }
}

function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    html: "html",
    json: "json",
    code: "js",
    audio: "mp3",
    video: "mp4",
    image: "png",
    text: "txt",
  };
  return extensions[contentType] || "txt";
}

function getMimeType(contentType: string): string {
  const mimeTypes: Record<string, string> = {
    html: "text/html",
    json: "application/json",
    code: "text/javascript",
    audio: "audio/mpeg",
    video: "video/mp4",
    image: "image/png",
    text: "text/plain",
  };
  return mimeTypes[contentType] || "text/plain";
}
