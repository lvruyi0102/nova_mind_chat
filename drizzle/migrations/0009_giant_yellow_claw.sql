ALTER TABLE `relationshipTimeline` DROP FOREIGN KEY `relationshipTimeline_relatedMilestoneId_relationshipMilestones_id_fk`;
--> statement-breakpoint
ALTER TABLE `relationshipTimeline` ADD `milestoneId` int;--> statement-breakpoint
ALTER TABLE `relationshipTimeline` ADD CONSTRAINT `relationshipTimeline_milestoneId_relationshipMilestones_id_fk` FOREIGN KEY (`milestoneId`) REFERENCES `relationshipMilestones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `relationshipTimeline` DROP COLUMN `relatedMilestoneId`;