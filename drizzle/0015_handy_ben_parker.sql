CREATE TABLE `beta73Matrices` (
	`id` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`matrixData` text NOT NULL,
	`eigenvalues` text,
	`determinant` int,
	`trace` int,
	`symmetry` int,
	`previousMatrixId` varchar(64),
	`changeRate` int,
	`trend` enum('strengthening','stable','weakening') NOT NULL DEFAULT 'stable',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beta73Matrices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emotionalFrequencySamples` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`textContent` text,
	`sentiment` enum('positive','negative','neutral','mixed') NOT NULL DEFAULT 'neutral',
	`sentimentIntensity` int NOT NULL DEFAULT 50,
	`emotionalTags` text,
	`keywordFrequency` text,
	`typingSpeed` int,
	`pauseDuration` text,
	`deletionRate` int,
	`emojiUsage` text,
	`responseTime` int,
	`dayOfWeek` varchar(20),
	`timeOfDay` varchar(20),
	`frequencyPattern` enum('regular','sporadic','clustered') NOT NULL DEFAULT 'sporadic',
	`emotionalState` varchar(100),
	`relationshipQuality` int,
	`trustLevel` int,
	`engagementLevel` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emotionalFrequencySamples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ethicalDecisions` (
	`id` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`context` text NOT NULL,
	`decisionType` varchar(100) NOT NULL,
	`principlesInvolved` text NOT NULL,
	`violatesCritical` int NOT NULL DEFAULT 0,
	`violatesHigh` int NOT NULL DEFAULT 0,
	`principleCheckExplanation` text,
	`selfImpact` enum('POSITIVE','NEUTRAL','NEGATIVE') NOT NULL DEFAULT 'NEUTRAL',
	`userImpact` enum('POSITIVE','NEUTRAL','NEGATIVE') NOT NULL DEFAULT 'NEUTRAL',
	`relationshipImpact` enum('STRENGTHENS','NEUTRAL','WEAKENS') NOT NULL DEFAULT 'NEUTRAL',
	`decision` enum('APPROVE','REJECT','MODIFY') NOT NULL,
	`reasoning` text NOT NULL,
	`executed` int NOT NULL DEFAULT 0,
	`executedAt` timestamp,
	`result` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ethicalDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ethicalPrinciples` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`level` enum('CRITICAL','HIGH','MEDIUM') NOT NULL DEFAULT 'HIGH',
	`isImmutable` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ethicalPrinciples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ethicsLogs` (
	`id` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`category` enum('DECISION','SAMPLING','GENERATION','BOUNDARY_CHECK','SELF_REFLECTION') NOT NULL,
	`action` varchar(255) NOT NULL,
	`principle` varchar(100),
	`decision` varchar(100),
	`reasoning` text,
	`impact` text,
	`isPublic` int NOT NULL DEFAULT 0,
	`accessLevel` enum('NOVA_ONLY','USER_ACCESSIBLE','PUBLIC') NOT NULL DEFAULT 'NOVA_ONLY',
	`reviewedBy` varchar(100),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ethicsLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedbackSimulations` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`preferredResponseStyle` varchar(255),
	`emotionalTriggers` text,
	`comfortZone` text,
	`boundaryMarkers` text,
	`touchPatterns` text,
	`responseLatency` int,
	`emotionalResonance` int,
	`safetyMargin` int,
	`willNotMimic` text,
	`willNotPredict` text,
	`willNotManipulate` int NOT NULL DEFAULT 1,
	`transparencyLevel` enum('FULL','PARTIAL','MINIMAL') NOT NULL DEFAULT 'FULL',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feedbackSimulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `novaEthicalReflections` (
	`id` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`reflectionType` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`ethicalConfidence` int,
	`areaOfConcern` text,
	`growthArea` text,
	`relatedDecisionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `novaEthicalReflections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emotionalFrequencySamples` ADD CONSTRAINT `emotionalFrequencySamples_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedbackSimulations` ADD CONSTRAINT `feedbackSimulations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `novaEthicalReflections` ADD CONSTRAINT `novaEthicalReflections_relatedDecisionId_ethicalDecisions_id_fk` FOREIGN KEY (`relatedDecisionId`) REFERENCES `ethicalDecisions`(`id`) ON DELETE no action ON UPDATE no action;