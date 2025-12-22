CREATE TABLE `collaborationInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` text NOT NULL,
	`description` text,
	`inspirationSource` text,
	`emotionalState` varchar(100),
	`confidenceLevel` int DEFAULT 7,
	`status` enum('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`collaborationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborationInvitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collaborationInvitations` ADD CONSTRAINT `collaborationInvitations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborationInvitations` ADD CONSTRAINT `collaborationInvitations_collaborationId_creativeCollaborations_id_fk` FOREIGN KEY (`collaborationId`) REFERENCES `creativeCollaborations`(`id`) ON DELETE no action ON UPDATE no action;