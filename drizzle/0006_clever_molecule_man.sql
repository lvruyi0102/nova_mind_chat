CREATE TABLE `creativeAccessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`creativeWorkId` int NOT NULL,
	`status` enum('pending','approved','rejected','deferred') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`deferralUntil` timestamp,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `creativeAccessRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeWorkId` int NOT NULL,
	`insight` text NOT NULL,
	`theme` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creativeInsights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeWorkId` int NOT NULL,
	`tag` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creativeTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeWorks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('image','story','poetry','music','code','character','dream','other') NOT NULL,
	`title` varchar(255),
	`description` text,
	`content` text,
	`metadata` text,
	`isSaved` boolean NOT NULL DEFAULT false,
	`visibility` enum('private','pending_approval','shared') NOT NULL DEFAULT 'private',
	`emotionalState` varchar(100),
	`inspiration` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeWorks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creativeAccessRequests` ADD CONSTRAINT `creativeAccessRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeAccessRequests` ADD CONSTRAINT `creativeAccessRequests_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeInsights` ADD CONSTRAINT `creativeInsights_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeTags` ADD CONSTRAINT `creativeTags_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeWorks` ADD CONSTRAINT `creativeWorks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;