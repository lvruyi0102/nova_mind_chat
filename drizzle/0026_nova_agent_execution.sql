CREATE TABLE `agentTasks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskKey` varchar(64) NOT NULL,
  `userId` int NOT NULL,
  `goal` text NOT NULL,
  `planJson` text,
  `status` enum('CREATED','PLANNING','READY','RUNNING','RETRYING','VERIFYING','SUCCEEDED','PARTIAL','BLOCKED','FAILED','CANCELLED') NOT NULL DEFAULT 'CREATED',
  `priority` int NOT NULL DEFAULT 5,
  `budgetJson` text,
  `usageJson` text,
  `cancelRequested` boolean NOT NULL DEFAULT false,
  `lastError` text,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agentTasks_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentTasks_taskKey_unique` UNIQUE(`taskKey`),
  CONSTRAINT `agentTasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentTaskSteps` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `stepKey` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `capabilityId` varchar(191) NOT NULL,
  `dependsOnJson` text NOT NULL,
  `acceptanceCriteriaJson` text NOT NULL,
  `inputJson` text,
  `outputJson` text,
  `status` enum('PENDING','READY','RUNNING','RETRYING','VERIFYING','SUCCEEDED','PARTIAL','BLOCKED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `attemptCount` int NOT NULL DEFAULT 0,
  `maxAttempts` int NOT NULL DEFAULT 3,
  `externalJobId` varchar(191),
  `lastError` text,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agentTaskSteps_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentTaskSteps_taskId_stepKey_unique` UNIQUE(`taskId`,`stepKey`),
  CONSTRAINT `agentTaskSteps_taskId_agentTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `agentTasks`(`id`),
  INDEX `agentTaskSteps_taskId_status_idx` (`taskId`,`status`)
);
--> statement-breakpoint
CREATE TABLE `agentToolRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `stepId` int,
  `adapterName` varchar(191) NOT NULL,
  `capabilityId` varchar(191) NOT NULL,
  `idempotencyKey` varchar(191) NOT NULL,
  `externalJobId` varchar(191),
  `status` enum('CREATED','RUNNING','SUCCEEDED','FAILED','BLOCKED','UNKNOWN') NOT NULL DEFAULT 'CREATED',
  `requestMetadata` text,
  `responseMetadata` text,
  `errorMessage` text,
  `startedAt` timestamp,
  `finishedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `agentToolRuns_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentToolRuns_idempotencyKey_unique` UNIQUE(`idempotencyKey`),
  CONSTRAINT `agentToolRuns_taskId_agentTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `agentTasks`(`id`),
  CONSTRAINT `agentToolRuns_stepId_agentTaskSteps_id_fk` FOREIGN KEY (`stepId`) REFERENCES `agentTaskSteps`(`id`),
  INDEX `agentToolRuns_taskId_createdAt_idx` (`taskId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `agentArtifacts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `stepId` int,
  `uri` text NOT NULL,
  `mediaType` varchar(191) NOT NULL,
  `checksum` varchar(128),
  `sizeBytes` int,
  `metadataJson` text,
  `validationStatus` enum('UNVERIFIED','PASSED','FAILED') NOT NULL DEFAULT 'UNVERIFIED',
  `validationDetails` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `agentArtifacts_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentArtifacts_taskId_agentTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `agentTasks`(`id`),
  CONSTRAINT `agentArtifacts_stepId_agentTaskSteps_id_fk` FOREIGN KEY (`stepId`) REFERENCES `agentTaskSteps`(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentAcceptanceChecks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `stepId` int,
  `checkKey` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `required` boolean NOT NULL DEFAULT true,
  `status` enum('UNVERIFIED','PASSED','FAILED') NOT NULL DEFAULT 'UNVERIFIED',
  `evidenceJson` text,
  `diagnostic` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agentAcceptanceChecks_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentAcceptanceChecks_taskId_checkKey_unique` UNIQUE(`taskId`,`checkKey`),
  CONSTRAINT `agentAcceptanceChecks_taskId_agentTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `agentTasks`(`id`),
  CONSTRAINT `agentAcceptanceChecks_stepId_agentTaskSteps_id_fk` FOREIGN KEY (`stepId`) REFERENCES `agentTaskSteps`(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentTaskEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `taskId` int NOT NULL,
  `actor` varchar(64) NOT NULL DEFAULT 'system',
  `eventType` varchar(191) NOT NULL,
  `payloadJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `agentTaskEvents_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentTaskEvents_taskId_agentTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `agentTasks`(`id`),
  INDEX `agentTaskEvents_taskId_createdAt_idx` (`taskId`,`createdAt`)
);
