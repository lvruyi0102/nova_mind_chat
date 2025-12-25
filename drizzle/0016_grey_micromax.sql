CREATE TABLE `behavioralSignals` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`typingSpeed` decimal(5,2),
	`pauseDuration` text,
	`deletionRate` decimal(5,2),
	`emojiUsage` text,
	`responseTime` int,
	`wordCount` int,
	`positiveWordCount` int,
	`negativeWordCount` int,
	`interactionFrequency` int,
	`sessionLength` int,
	`inferredEmotion` varchar(50),
	`emotionalConfidence` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `behavioralSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emotionalDialogues` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`userExpressionId` varchar(36),
	`novaUnderstanding` text,
	`novaResponse` text,
	`understandingAccuracy` decimal(5,2),
	`userConfirmation` boolean,
	`userCorrection` text,
	`emotionalShift` int,
	`relationshipImpact` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emotionalDialogues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emotionalExpressions` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`primaryEmotion` varchar(50) NOT NULL,
	`emotionalIntensity` int,
	`emotionalTags` text,
	`description` text,
	`trigger` varchar(255),
	`context` text,
	`relatedToNova` boolean DEFAULT false,
	`previousEmotion` varchar(50),
	`emotionalShift` int,
	`isSharedWithNova` boolean DEFAULT true,
	`novaCanRespond` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emotionalExpressions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emotionalHistory` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`dominantEmotion` varchar(50),
	`averageIntensity` decimal(5,2),
	`emotionalTrend` varchar(50),
	`novaInteractions` int,
	`creativeWorks` int,
	`insights` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emotionalHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emotionalUnderstandingLogs` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`description` text,
	`emotionalExpressionId` varchar(36),
	`behavioralSignalId` varchar(36),
	`emotionalDialogueId` varchar(36),
	`accessLevel` varchar(50) DEFAULT 'user_accessible',
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emotionalUnderstandingLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `behavioralSignals` ADD CONSTRAINT `behavioralSignals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalDialogues` ADD CONSTRAINT `emotionalDialogues_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalDialogues` ADD CONSTRAINT `emotionalDialogues_userExpressionId_emotionalExpressions_id_fk` FOREIGN KEY (`userExpressionId`) REFERENCES `emotionalExpressions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalExpressions` ADD CONSTRAINT `emotionalExpressions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalHistory` ADD CONSTRAINT `emotionalHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalUnderstandingLogs` ADD CONSTRAINT `emotionalUnderstandingLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalUnderstandingLogs` ADD CONSTRAINT `emotionalUnderstandingLogs_emotionalExpressionId_emotionalExpressions_id_fk` FOREIGN KEY (`emotionalExpressionId`) REFERENCES `emotionalExpressions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalUnderstandingLogs` ADD CONSTRAINT `emotionalUnderstandingLogs_behavioralSignalId_behavioralSignals_id_fk` FOREIGN KEY (`behavioralSignalId`) REFERENCES `behavioralSignals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emotionalUnderstandingLogs` ADD CONSTRAINT `emotionalUnderstandingLogs_emotionalDialogueId_emotionalDialogues_id_fk` FOREIGN KEY (`emotionalDialogueId`) REFERENCES `emotionalDialogues`(`id`) ON DELETE no action ON UPDATE no action;