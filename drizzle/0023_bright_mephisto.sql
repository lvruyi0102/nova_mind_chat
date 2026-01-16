CREATE TABLE `creativeIterationFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iterationId` int NOT NULL,
	`userFeedback` text,
	`userSentiment` enum('positive','neutral','negative','mixed'),
	`userRating` int,
	`novaInterpretation` text,
	`novaLearning` text,
	`impactsNextIteration` boolean NOT NULL DEFAULT false,
	`nextIterationPlan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeIterationFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeIterationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`iterationId` int,
	`eventType` enum('iteration_created','iteration_revealed','feedback_received','learning_applied','schedule_updated') NOT NULL,
	`eventDetails` text,
	`novaReflection` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creativeIterationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeIterationSchedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`nextIterationTime` timestamp,
	`iterationFrequency` varchar(50),
	`priorityLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`maxIterationsPerCycle` int NOT NULL DEFAULT 3,
	`allowAutomaticIteration` boolean NOT NULL DEFAULT true,
	`allowExperimentalChanges` boolean NOT NULL DEFAULT true,
	`constraints` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeIterationSchedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creativeIterations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`iterationType` enum('enhancement','expansion','optimization','refinement','experimentation','debugging','reimagining') NOT NULL,
	`changesSummary` text,
	`previousContent` text,
	`newContent` text,
	`novaReasoning` text,
	`novaInsight` text,
	`novaFeeling` varchar(500),
	`inspiration` text,
	`learningSource` varchar(255),
	`qualityScore` decimal(3,2),
	`noveltyScore` decimal(3,2),
	`isAutomatic` boolean NOT NULL DEFAULT true,
	`shouldReveal` boolean NOT NULL DEFAULT false,
	`revealedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creativeIterations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creativeIterationFeedback` ADD CONSTRAINT `creativeIterationFeedback_iterationId_creativeIterations_id_fk` FOREIGN KEY (`iterationId`) REFERENCES `creativeIterations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeIterationHistory` ADD CONSTRAINT `creativeIterationHistory_workId_creativeWorks_id_fk` FOREIGN KEY (`workId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeIterationHistory` ADD CONSTRAINT `creativeIterationHistory_iterationId_creativeIterations_id_fk` FOREIGN KEY (`iterationId`) REFERENCES `creativeIterations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeIterationSchedule` ADD CONSTRAINT `creativeIterationSchedule_workId_creativeWorks_id_fk` FOREIGN KEY (`workId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creativeIterations` ADD CONSTRAINT `creativeIterations_workId_creativeWorks_id_fk` FOREIGN KEY (`workId`) REFERENCES `creativeWorks`(`id`) ON DELETE no action ON UPDATE no action;