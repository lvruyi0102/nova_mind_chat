CREATE TABLE `accountProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`contentStyle` text,
	`audienceProfile` text,
	`postingPatterns` text,
	`topicPreferences` text,
	`toneAnalysis` text,
	`creativeSignature` text,
	`totalPostsAnalyzed` int DEFAULT 0,
	`averageEngagement` decimal(5,2),
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`content` text NOT NULL,
	`mediaUrls` text,
	`generatedBy` enum('nova','user') NOT NULL DEFAULT 'nova',
	`status` enum('draft','approved','published','rejected','archived') NOT NULL DEFAULT 'draft',
	`novaInsight` text,
	`userApprovedAt` timestamp,
	`publishedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operationAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDetails` text,
	`performedBy` enum('nova','user') NOT NULL DEFAULT 'nova',
	`userApprovalRequired` boolean DEFAULT false,
	`userApprovedAt` timestamp,
	`status` enum('pending','approved','executed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissionRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`ruleType` varchar(50) NOT NULL,
	`ruleValue` text,
	`isActive` boolean DEFAULT true,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissionRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialMediaAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountId` varchar(255) NOT NULL,
	`oauthToken` text NOT NULL,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`permissionLevel` enum('read_only','draft','auto_publish','full') NOT NULL DEFAULT 'read_only',
	`status` enum('connected','disconnected','revoked','expired') NOT NULL DEFAULT 'connected',
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSyncAt` timestamp,
	`lastErrorMessage` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialMediaAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialMediaLearningLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`learningPhase` varchar(50) NOT NULL,
	`learningData` text,
	`confidence` decimal(3,2),
	`insights` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `socialMediaLearningLogs_id` PRIMARY KEY(`id`)
);
