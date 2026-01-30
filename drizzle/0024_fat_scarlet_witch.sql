CREATE TABLE `learningLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`learningType` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`keywordsList` text,
	`conceptsList` text,
	`depth` enum('shallow','medium','deep') NOT NULL DEFAULT 'medium',
	`topicsIdentified` text,
	`mainInsight` text,
	`secondaryInsights` text,
	`connections` text,
	`messageCount` int NOT NULL DEFAULT 0,
	`conceptsExtracted` int NOT NULL DEFAULT 0,
	`thoughtsGenerated` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `learningLogs` ADD CONSTRAINT `learningLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;