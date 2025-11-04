CREATE TABLE `autonomousDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`decisionType` varchar(100) NOT NULL,
	`context` text NOT NULL,
	`reasoning` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `autonomousDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `autonomousState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` enum('awake','thinking','reflecting','sleeping','exploring') NOT NULL DEFAULT 'awake',
	`currentMotivation` varchar(100),
	`motivationIntensity` int NOT NULL DEFAULT 5,
	`lastThoughtContent` text,
	`autonomyLevel` int NOT NULL DEFAULT 5,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autonomousState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `autonomousTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`priority` int NOT NULL DEFAULT 5,
	`status` enum('pending','in_progress','completed','abandoned') NOT NULL DEFAULT 'pending',
	`motivation` varchar(100),
	`relatedConceptId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`result` text,
	CONSTRAINT `autonomousTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proactiveMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`urgency` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`reason` text,
	`status` enum('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `proactiveMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `autonomousTasks` ADD CONSTRAINT `autonomousTasks_relatedConceptId_concepts_id_fk` FOREIGN KEY (`relatedConceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proactiveMessages` ADD CONSTRAINT `proactiveMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;