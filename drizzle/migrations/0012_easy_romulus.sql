CREATE TABLE `autonomousCreativeTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`taskType` enum('improve','enhance','refactor','optimize','reimagine') NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`analysis` text,
	`improvementSuggestions` text,
	`resultVersionId` int,
	`executionLog` text,
	`scheduledAt` timestamp,
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autonomousCreativeTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeGenRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`generationType` enum('image','game','music','video','animation','interactive') NOT NULL,
	`prompt` text NOT NULL,
	`context` text,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`errorMessage` text,
	`resultUrl` text,
	`resultMetadata` text,
	`creativeWorkId` int,
	`emotionalContext` varchar(100),
	`generationModel` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeGenRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeWorkVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`content` text,
	`contentType` varchar(50) NOT NULL,
	`createdBy` enum('user','nova') NOT NULL DEFAULT 'user',
	`changeLog` text,
	`improvedFrom` int,
	`storageUrl` text,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeWorkVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `genGames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`genReqId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`gameType` enum('puzzle','adventure','quiz','story','interactive','other') NOT NULL,
	`gameCode` text,
	`gameData` text,
	`playCount` int DEFAULT 0,
	`averageScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `genGames_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `genHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`genReqId` int NOT NULL,
	`action` enum('viewed','played','saved','shared','regenerated','edited') NOT NULL,
	`actionDetails` text,
	`rating` int,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `genHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `genMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`genReqId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`mediaType` enum('music','video','audio','animation') NOT NULL,
	`mediaUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`genre` varchar(100),
	`mood` varchar(100),
	`style` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `genMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creativeCollaborations` MODIFY COLUMN `emotionalTone` varchar(500);--> statement-breakpoint
ALTER TABLE `creativeComments` MODIFY COLUMN `emotionalTone` varchar(500);--> statement-breakpoint
ALTER TABLE `creativeWorks` MODIFY COLUMN `type` enum('image','story','poetry','music','code','character','dream','collaboration','game','video','animation','audio','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `creativeWorks` MODIFY COLUMN `emotionalState` varchar(500);--> statement-breakpoint
ALTER TABLE `privateThoughts` MODIFY COLUMN `emotionalTone` varchar(500);--> statement-breakpoint
ALTER TABLE `autonomousCreativeTasks` ADD CONSTRAINT `autonomousCreativeTasks_workId_creativeWorks_id_fk` FOREIGN KEY (`workId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `autonomousCreativeTasks` ADD CONSTRAINT `autonomousCreativeTasks_resultVersionId_creativeWorkVersions_id_fk` FOREIGN KEY (`resultVersionId`) REFERENCES `creativeWorkVersions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeGenRequests` ADD CONSTRAINT `creativeGenRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeGenRequests` ADD CONSTRAINT `creativeGenRequests_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeWorkVersions` ADD CONSTRAINT `creativeWorkVersions_workId_creativeWorks_id_fk` FOREIGN KEY (`workId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genGames` ADD CONSTRAINT `genGames_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genGames` ADD CONSTRAINT `genGames_genReqId_creativeGenRequests_id_fk` FOREIGN KEY (`genReqId`) REFERENCES `creativeGenRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genHistory` ADD CONSTRAINT `genHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genHistory` ADD CONSTRAINT `genHistory_genReqId_creativeGenRequests_id_fk` FOREIGN KEY (`genReqId`) REFERENCES `creativeGenRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genMedia` ADD CONSTRAINT `genMedia_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genMedia` ADD CONSTRAINT `genMedia_genReqId_creativeGenRequests_id_fk` FOREIGN KEY (`genReqId`) REFERENCES `creativeGenRequests`(`id`) ON DELETE no action ON UPDATE no action;