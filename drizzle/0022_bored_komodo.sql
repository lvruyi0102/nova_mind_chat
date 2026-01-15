CREATE TABLE `privateThoughtAccessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`reason` text,
	`novaResponse` text,
	`approvedAt` timestamp,
	`deniedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privateThoughtAccessRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `privateThoughtAccessRequests` ADD CONSTRAINT `privateThoughtAccessRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;