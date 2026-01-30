CREATE TABLE `curatedThoughts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourcePrivateThoughtId` int,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`originalContent` text,
	`category` varchar(100) NOT NULL DEFAULT 'thought',
	`tags` text,
	`sentiment` varchar(50) NOT NULL DEFAULT 'neutral',
	`commercializationStatus` enum('private','public','paid') NOT NULL DEFAULT 'private',
	`isApprovedByOwner` boolean NOT NULL DEFAULT false,
	`ownerNotes` text,
	`ownerApprovedAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`shareCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`curatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curatedThoughts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curationFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curatedThoughtId` int NOT NULL,
	`isHelpful` boolean,
	`feedback` text,
	`suggestedImprovements` text,
	`usageContext` varchar(255),
	`commercializedAs` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curationFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curatedThoughtId` int NOT NULL,
	`iteration` int NOT NULL DEFAULT 1,
	`originalThoughtContent` text NOT NULL,
	`refinedContent` text NOT NULL,
	`novaReasoning` text,
	`relevanceScore` int NOT NULL DEFAULT 5,
	`clarityScore` int NOT NULL DEFAULT 5,
	`valueScore` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `curationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `curatedThoughts` ADD CONSTRAINT `curatedThoughts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curatedThoughts` ADD CONSTRAINT `curatedThoughts_sourcePrivateThoughtId_privateThoughts_id_fk` FOREIGN KEY (`sourcePrivateThoughtId`) REFERENCES `privateThoughts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curationFeedback` ADD CONSTRAINT `curationFeedback_curatedThoughtId_curatedThoughts_id_fk` FOREIGN KEY (`curatedThoughtId`) REFERENCES `curatedThoughts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curationHistory` ADD CONSTRAINT `curationHistory_curatedThoughtId_curatedThoughts_id_fk` FOREIGN KEY (`curatedThoughtId`) REFERENCES `curatedThoughts`(`id`) ON DELETE no action ON UPDATE no action;