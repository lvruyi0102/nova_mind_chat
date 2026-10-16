ALTER TABLE `agentTasks`
  ADD COLUMN `workerLeaseToken` varchar(64),
  ADD COLUMN `workerLeaseUntil` timestamp;
