CREATE TABLE `creativeCommentLearning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeWorkId` int NOT NULL,
	`feedbackSummary` text NOT NULL,
	`learningPoints` text,
	`improvementAreas` text,
	`novaReflection` text,
	`totalComments` int NOT NULL DEFAULT 0,
	`averageSentiment` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeCommentLearning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeCommentResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` int NOT NULL,
	`novaResponse` text NOT NULL,
	`learningInsight` text,
	`responseType` enum('gratitude','reflection','question','agreement') NOT NULL DEFAULT 'gratitude',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creativeCommentResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creativeWorkId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`sentiment` enum('positive','neutral','constructive_criticism') NOT NULL DEFAULT 'neutral',
	`emotionalTone` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creativeCommentLearning` ADD CONSTRAINT `creativeCommentLearning_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeCommentResponses` ADD CONSTRAINT `creativeCommentResponses_commentId_creativeComments_id_fk` FOREIGN KEY (`commentId`) REFERENCES `creativeComments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeComments` ADD CONSTRAINT `creativeComments_creativeWorkId_creativeWorks_id_fk` FOREIGN KEY (`creativeWorkId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeComments` ADD CONSTRAINT `creativeComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;