CREATE TABLE `world_entities` (
  `entityId` varchar(36) NOT NULL,
  `entityType` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `latitude` decimal(10,7),
  `longitude` decimal(10,7),
  `propertiesJson` text,
  `sourceUri` varchar(1000),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `world_entities_entityId` PRIMARY KEY(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `world_observations` (
  `observationId` varchar(36) NOT NULL,
  `entityId` varchar(36) NOT NULL,
  `metric` varchar(160) NOT NULL,
  `value` decimal(24,8) NOT NULL,
  `unit` varchar(48) NOT NULL,
  `observedAt` timestamp NOT NULL,
  `ingestedAt` timestamp NOT NULL DEFAULT (now()),
  `sourceName` varchar(255) NOT NULL,
  `sourceUri` varchar(1000),
  `qualityStatus` enum('unverified','valid','suspect','rejected') NOT NULL DEFAULT 'unverified',
  `qualityNotes` text,
  `rawPayload` text,
  CONSTRAINT `world_observations_observationId` PRIMARY KEY(`observationId`)
);
--> statement-breakpoint
CREATE TABLE `causal_hypotheses` (
  `hypothesisId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `causeEntityId` varchar(36),
  `effectEntityId` varchar(36),
  `mechanism` text NOT NULL,
  `assumptionsJson` text,
  `evidenceJson` text,
  `confidence` decimal(5,4),
  `status` enum('proposed','testing','supported','rejected','superseded') NOT NULL DEFAULT 'proposed',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `reviewedAt` timestamp,
  CONSTRAINT `causal_hypotheses_hypothesisId` PRIMARY KEY(`hypothesisId`)
);
--> statement-breakpoint
CREATE TABLE `digital_earth_scenarios` (
  `scenarioId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `scenarioType` enum('baseline','stress','intervention','custom') NOT NULL DEFAULT 'custom',
  `inputJson` text NOT NULL,
  `outputJson` text,
  `modelVersion` varchar(80) NOT NULL,
  `runStatus` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  `limitations` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  CONSTRAINT `digital_earth_scenarios_scenarioId` PRIMARY KEY(`scenarioId`)
);
--> statement-breakpoint
CREATE TABLE `world_forecasts` (
  `forecastId` varchar(36) NOT NULL,
  `entityId` varchar(36) NOT NULL,
  `metric` varchar(160) NOT NULL,
  `predictedValue` decimal(24,8) NOT NULL,
  `unit` varchar(48) NOT NULL,
  `targetAt` timestamp NOT NULL,
  `issuedAt` timestamp NOT NULL DEFAULT (now()),
  `modelVersion` varchar(80) NOT NULL,
  `assumptionsJson` text,
  `status` enum('open','evaluated','withdrawn') NOT NULL DEFAULT 'open',
  CONSTRAINT `world_forecasts_forecastId` PRIMARY KEY(`forecastId`)
);
--> statement-breakpoint
CREATE TABLE `forecast_evaluations` (
  `evaluationId` varchar(36) NOT NULL,
  `forecastId` varchar(36) NOT NULL,
  `observationId` varchar(36) NOT NULL,
  `absoluteError` decimal(24,8),
  `relativeError` decimal(12,8),
  `evaluationStatus` enum('matched','unit_mismatch','time_mismatch','quality_rejected','manual_review') NOT NULL,
  `notes` text,
  `evaluatedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `forecast_evaluations_evaluationId` PRIMARY KEY(`evaluationId`)
);
--> statement-breakpoint
CREATE TABLE `evolution_proposals` (
  `proposalId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `rationale` text NOT NULL,
  `changeType` varchar(80) NOT NULL,
  `baselineVersion` varchar(80) NOT NULL,
  `candidateVersion` varchar(80),
  `testResultsJson` text,
  `status` enum('proposed','testing','passed','failed','approved','rejected','rolled_back') NOT NULL DEFAULT 'proposed',
  `approvedBy` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `reviewedAt` timestamp,
  CONSTRAINT `evolution_proposals_proposalId` PRIMARY KEY(`proposalId`)
);
--> statement-breakpoint
ALTER TABLE `world_observations` ADD CONSTRAINT `world_observations_entityId_world_entities_entityId_fk` FOREIGN KEY (`entityId`) REFERENCES `world_entities`(`entityId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `causal_hypotheses` ADD CONSTRAINT `causal_hypotheses_causeEntityId_world_entities_entityId_fk` FOREIGN KEY (`causeEntityId`) REFERENCES `world_entities`(`entityId`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `causal_hypotheses` ADD CONSTRAINT `causal_hypotheses_effectEntityId_world_entities_entityId_fk` FOREIGN KEY (`effectEntityId`) REFERENCES `world_entities`(`entityId`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `world_forecasts` ADD CONSTRAINT `world_forecasts_entityId_world_entities_entityId_fk` FOREIGN KEY (`entityId`) REFERENCES `world_entities`(`entityId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `forecast_evaluations` ADD CONSTRAINT `forecast_evaluations_forecastId_world_forecasts_forecastId_fk` FOREIGN KEY (`forecastId`) REFERENCES `world_forecasts`(`forecastId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `forecast_evaluations` ADD CONSTRAINT `forecast_evaluations_observationId_world_observations_observationId_fk` FOREIGN KEY (`observationId`) REFERENCES `world_observations`(`observationId`) ON DELETE cascade ON UPDATE no action;