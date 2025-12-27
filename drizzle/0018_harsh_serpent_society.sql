CREATE TABLE `ruleExecutionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`ruleId` int NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDetails` text,
	`ruleMatched` boolean NOT NULL,
	`actionTaken` enum('allowed','denied','approval_required','limited') NOT NULL,
	`reason` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ruleExecutionLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ruleTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(50) NOT NULL,
	`rules` text NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ruleTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `permissionRules` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `permissionRules` ADD `permission` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `permissionRules` ADD `action` enum('allow','deny','require_approval','limit') NOT NULL;--> statement-breakpoint
ALTER TABLE `permissionRules` ADD `parameters` text;--> statement-breakpoint
ALTER TABLE `permissionRules` ADD `priority` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `permissionRules` DROP COLUMN `ruleValue`;--> statement-breakpoint
ALTER TABLE `permissionRules` DROP COLUMN `description`;