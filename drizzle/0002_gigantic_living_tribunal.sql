CREATE TABLE `cognitiveLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stage` varchar(100) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`conversationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cognitiveLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conceptRelations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromConceptId` int NOT NULL,
	`toConceptId` int NOT NULL,
	`relationType` varchar(50) NOT NULL,
	`strength` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conceptRelations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`confidence` int NOT NULL DEFAULT 5,
	`firstEncountered` timestamp NOT NULL DEFAULT (now()),
	`lastReinforced` timestamp NOT NULL DEFAULT (now()),
	`encounterCount` int NOT NULL DEFAULT 1,
	CONSTRAINT `concepts_id` PRIMARY KEY(`id`),
	CONSTRAINT `concepts_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `episodicMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`content` text NOT NULL,
	`context` text,
	`importance` int NOT NULL DEFAULT 5,
	`emotionalTone` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `episodicMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growthMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricName` varchar(100) NOT NULL,
	`value` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growthMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reflectionLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reflectionType` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`previousBelief` text,
	`newBelief` text,
	`conversationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reflectionLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selfQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`category` varchar(100),
	`priority` int NOT NULL DEFAULT 5,
	`status` enum('pending','exploring','answered','abandoned') NOT NULL DEFAULT 'pending',
	`relatedConceptId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	CONSTRAINT `selfQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cognitiveLog` ADD CONSTRAINT `cognitiveLog_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conceptRelations` ADD CONSTRAINT `conceptRelations_fromConceptId_concepts_id_fk` FOREIGN KEY (`fromConceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conceptRelations` ADD CONSTRAINT `conceptRelations_toConceptId_concepts_id_fk` FOREIGN KEY (`toConceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `episodicMemories` ADD CONSTRAINT `episodicMemories_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reflectionLog` ADD CONSTRAINT `reflectionLog_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `selfQuestions` ADD CONSTRAINT `selfQuestions_relatedConceptId_concepts_id_fk` FOREIGN KEY (`relatedConceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;