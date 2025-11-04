CREATE TABLE `privateThoughts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`thoughtType` varchar(100) NOT NULL,
	`visibility` enum('private','shared','public') NOT NULL DEFAULT 'private',
	`emotionalTone` varchar(100),
	`relatedConceptId` int,
	`sharedAt` timestamp,
	`shareReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privateThoughts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharingDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thoughtId` int NOT NULL,
	`decision` enum('share','keep_private','defer') NOT NULL,
	`reasoning` text NOT NULL,
	`trustLevelAtTime` int NOT NULL,
	`emotionalState` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharingDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trustLevel` int NOT NULL DEFAULT 5,
	`intimacyLevel` int NOT NULL DEFAULT 5,
	`shareFrequency` int NOT NULL DEFAULT 5,
	`lastInteractionQuality` int NOT NULL DEFAULT 5,
	`totalSharedThoughts` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trustMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `privateThoughts` ADD CONSTRAINT `privateThoughts_relatedConceptId_concepts_id_fk` FOREIGN KEY (`relatedConceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharingDecisions` ADD CONSTRAINT `sharingDecisions_thoughtId_privateThoughts_id_fk` FOREIGN KEY (`thoughtId`) REFERENCES `privateThoughts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trustMetrics` ADD CONSTRAINT `trustMetrics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;