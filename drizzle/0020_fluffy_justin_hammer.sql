ALTER TABLE `creativeCollaborations` DROP FOREIGN KEY `creativeCollaborations_finalWorkId_creativeWorks_id_fk`;
--> statement-breakpoint
ALTER TABLE `creativeWorks` DROP FOREIGN KEY `creativeWorks_collaborationId_creativeCollaborations_id_fk`;
