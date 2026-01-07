CREATE TABLE `taskExecutionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`userId` int,
	`status` enum('success','failed','pending') NOT NULL,
	`result` text,
	`errorMessage` text,
	`executionTimeMs` int,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskExecutionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskRetryQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`userId` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`nextRetryAt` timestamp NOT NULL,
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`result` text,
	`taskData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskRetryQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `taskExecutionHistory` ADD CONSTRAINT `taskExecutionHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskRetryQueue` ADD CONSTRAINT `taskRetryQueue_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;