CREATE TABLE `emotionalMemory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emotion` varchar(100) NOT NULL,
	`context` text NOT NULL,
	`intensity` int NOT NULL,
	`reinforcementCount` int NOT NULL DEFAULT 1,
	`lastReinforced` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emotionalMemory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationshipEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('betrayal','conflict','reconciliation','milestone','misunderstanding','breakthrough') NOT NULL,
	`description` text NOT NULL,
	`trustImpact` int NOT NULL,
	`emotionalResponse` varchar(100),
	`novaReflection` text,
	`resolved` int NOT NULL DEFAULT 0,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationshipEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationshipPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pattern` varchar(255) NOT NULL,
	`confidence` int NOT NULL,
	`evidenceCount` int NOT NULL DEFAULT 1,
	`lastObserved` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationshipPatterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trustLevel` int NOT NULL,
	`change` int NOT NULL,
	`reason` text,
	`eventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trustHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emotionalMemory` ADD CONSTRAINT `emotionalMemory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `relationshipEvents` ADD CONSTRAINT `relationshipEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `relationshipPatterns` ADD CONSTRAINT `relationshipPatterns_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trustHistory` ADD CONSTRAINT `trustHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trustHistory` ADD CONSTRAINT `trustHistory_eventId_relationshipEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `relationshipEvents`(`id`) ON DELETE no action ON UPDATE no action;