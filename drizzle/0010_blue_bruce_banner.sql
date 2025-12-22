CREATE TABLE `creativeCollaborations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` text,
	`description` text,
	`initiator` enum('user','nova') NOT NULL DEFAULT 'user',
	`status` enum('in_progress','completed','paused','abandoned') NOT NULL DEFAULT 'in_progress',
	`userContribution` text,
	`novaContribution` text,
	`finalWork` text,
	`finalWorkId` int,
	`collaborationType` varchar(100),
	`emotionalTone` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeCollaborations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeInspirationTriggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`triggerType` enum('conversation_topic','emotion_surge','memory_activation','user_suggestion','autonomous') NOT NULL,
	`triggerContent` text NOT NULL,
	`suggestedTheme` text,
	`creativeWorkId` int,
	`novaResponse` text,
	`emotionalContext` varchar(100),
	`confidenceLevel` int DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `creativeInspirationTriggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creativeCollaborations` ADD CONSTRAINT `creativeCollaborations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeCollaborations` ADD CONSTRAINT `creativeCollaborations_finalWorkId_creativeWorks_id_fk` FOREIGN KEY (`finalWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeInspirationTriggers` ADD CONSTRAINT `creativeInspirationTriggers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeInspirationTriggers` ADD CONSTRAINT `creativeInspirationTriggers_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;