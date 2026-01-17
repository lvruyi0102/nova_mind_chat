import { getDb } from "../server/db.js";
import { bulkCurationService } from "../server/services/bulkCurationService.js";

async function runBulkSync() {
  console.log("Starting bulk curation sync...");
  
  try {
    // Sync for user 1 (owner)
    await bulkCurationService.startBulkCuration(1, 5);
    console.log("Bulk sync completed!");
  } catch (error) {
    console.error("Error during bulk sync:", error);
    process.exit(1);
  }
}

runBulkSync();
