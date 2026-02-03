CREATE TABLE `cognitiveStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`thoughtCount` int NOT NULL DEFAULT 0,
	`learningRate` decimal(5,4) NOT NULL DEFAULT '0.5',
	`emotionalState` varchar(50) NOT NULL DEFAULT 'neutral',
	`activeProcesses` int NOT NULL DEFAULT 0,
	`memoryUsage` decimal(5,4) NOT NULL DEFAULT '0.5',
	`confidenceLevel` decimal(5,4) NOT NULL DEFAULT '0.5',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cognitiveStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeWorkContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeWorkId` int NOT NULL,
	`contentType` enum('text','image','audio','video','code','url','mixed') NOT NULL,
	`textContent` text,
	`imageUrl` varchar(2048),
	`videoUrl` varchar(2048),
	`thumbnailUrl` varchar(2048),
	`audioUrl` varchar(2048),
	`audioFormat` varchar(50),
	`duration` int,
	`codeContent` text,
	`codeLanguage` varchar(50),
	`externalUrl` varchar(2048),
	`metadata` text,
	`fileSize` int,
	`mimeType` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeWorkContent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performanceMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL,
	`memoryUsedMB` decimal(10,2) NOT NULL,
	`memoryTotalMB` decimal(10,2) NOT NULL,
	`memoryPercent` decimal(5,2) NOT NULL,
	`cacheHitRate` decimal(5,4) NOT NULL,
	`cacheMissRate` decimal(5,4) NOT NULL,
	`cacheSize` decimal(10,2) NOT NULL,
	`adaptiveIntervalMinutes` int NOT NULL,
	`gcCount` int NOT NULL,
	`cpuUsagePercent` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performanceMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recentThoughts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`confidence` decimal(5,4) NOT NULL DEFAULT '0.5',
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recentThoughts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ruleExecutionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` varchar(64) NOT NULL,
	`executionId` varchar(64) NOT NULL,
	`success` int NOT NULL,
	`score` decimal(3,2) NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`executionTime` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ruleExecutionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rule_execution_log` (
	`logId` varchar(36) NOT NULL,
	`ruleId` varchar(36) NOT NULL,
	`success` boolean NOT NULL,
	`score` decimal(5,4) NOT NULL,
	`executionTime` int,
	`context` text,
	`output` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rule_execution_log_logId` PRIMARY KEY(`logId`)
);
--> statement-breakpoint
CREATE TABLE `ruleImprovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`improvementId` varchar(64) NOT NULL,
	`originalRuleId` varchar(64) NOT NULL,
	`improvedRuleCode` text NOT NULL,
	`reason` text NOT NULL,
	`expectedImprovement` decimal(3,2) NOT NULL,
	`status` enum('pending','testing','approved','rejected') NOT NULL DEFAULT 'pending',
	`testResults` text,
	`actualImprovement` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`appliedAt` timestamp,
	CONSTRAINT `ruleImprovements_id` PRIMARY KEY(`id`),
	CONSTRAINT `ruleImprovements_improvementId_unique` UNIQUE(`improvementId`)
);
--> statement-breakpoint
CREATE TABLE `ruleLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ruleCode` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`previousVersionId` varchar(64),
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`averageScore` decimal(3,2) NOT NULL DEFAULT '0.00',
	`confidence` decimal(3,2) NOT NULL DEFAULT '0.50',
	`priority` int NOT NULL DEFAULT 50,
	`status` enum('active','inactive','testing','archived') NOT NULL DEFAULT 'active',
	`source` enum('learned','manual','generated') NOT NULL DEFAULT 'learned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastUsedAt` timestamp,
	CONSTRAINT `ruleLibrary_id` PRIMARY KEY(`id`),
	CONSTRAINT `ruleLibrary_ruleId_unique` UNIQUE(`ruleId`)
);
--> statement-breakpoint
CREATE TABLE `rule_library` (
	`ruleId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`code` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('testing','active','inactive') NOT NULL DEFAULT 'testing',
	`priority` int DEFAULT 50,
	`successCount` int DEFAULT 0,
	`failureCount` int DEFAULT 0,
	`averageScore` decimal(5,4) DEFAULT '0',
	`confidence` decimal(5,4) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`activatedAt` timestamp,
	`lastExecutedAt` timestamp,
	CONSTRAINT `rule_library_ruleId` PRIMARY KEY(`ruleId`)
);
--> statement-breakpoint
CREATE TABLE `rule_version_history` (
	`historyId` varchar(36) NOT NULL,
	`ruleId` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`code` text NOT NULL,
	`changeReason` varchar(500),
	`expectedImprovement` decimal(5,4) DEFAULT '0',
	`actualImprovement` decimal(5,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rule_version_history_historyId` PRIMARY KEY(`historyId`)
);
--> statement-breakpoint
CREATE TABLE `selfIterationLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iterationId` varchar(64) NOT NULL,
	`ruleId` varchar(64) NOT NULL,
	`step` enum('analyze','generate','test','apply','validate') NOT NULL,
	`details` text,
	`success` int NOT NULL,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfIterationLog_id` PRIMARY KEY(`id`),
	CONSTRAINT `selfIterationLog_iterationId_unique` UNIQUE(`iterationId`)
);
--> statement-breakpoint
CREATE TABLE `self_iteration_log` (
	`iterationId` varchar(36) NOT NULL,
	`ruleId` varchar(36) NOT NULL,
	`status` enum('pending','running','success','failure') NOT NULL DEFAULT 'pending',
	`failureAnalysis` text,
	`improvements` text,
	`generatedCode` text,
	`expectedImprovement` decimal(5,4),
	`actualImprovement` decimal(5,4),
	`testsPassed` int,
	`testsFailed` int,
	`testDetails` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `self_iteration_log_iterationId` PRIMARY KEY(`iterationId`)
);
--> statement-breakpoint
ALTER TABLE `curatedThoughts` DROP FOREIGN KEY `curatedThoughts_sourcePrivateThoughtId_privateThoughts_id_fk`;
--> statement-breakpoint
ALTER TABLE `cognitiveStates` ADD CONSTRAINT `cognitiveStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeWorkContent` ADD CONSTRAINT `creativeWorkContent_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recentThoughts` ADD CONSTRAINT `recentThoughts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rule_execution_log` ADD CONSTRAINT `rule_execution_log_ruleId_rule_library_ruleId_fk` FOREIGN KEY (`ruleId`) REFERENCES `rule_library`(`ruleId`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rule_version_history` ADD CONSTRAINT `rule_version_history_ruleId_rule_library_ruleId_fk` FOREIGN KEY (`ruleId`) REFERENCES `rule_library`(`ruleId`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `self_iteration_log` ADD CONSTRAINT `self_iteration_log_ruleId_rule_library_ruleId_fk` FOREIGN KEY (`ruleId`) REFERENCES `rule_library`(`ruleId`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeWorks` DROP COLUMN `content`;