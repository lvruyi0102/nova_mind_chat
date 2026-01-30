import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nova_mind_chat',
});

try {
  console.log('Starting curation initialization...');

  // Get total count of privateThoughts
  const [countResult] = await connection.query('SELECT COUNT(*) as count FROM privateThoughts');
  const totalCount = countResult[0].count;
  console.log(`Found ${totalCount} privateThoughts to curate`);

  // Get sample privateThoughts
  const [thoughts] = await connection.query(
    'SELECT id, content, thoughtType, emotionalTone, createdAt FROM privateThoughts ORDER BY createdAt DESC LIMIT 50'
  );

  console.log(`Processing ${thoughts.length} thoughts...`);

  let successCount = 0;
  let errorCount = 0;

  for (const thought of thoughts) {
    try {
      // Simple curation: just extract title from first 50 chars
      const title = thought.content.substring(0, 50).replace(/\n/g, ' ') + '...';
      const category = thought.thoughtType || 'thought';
      const sentiment = thought.emotionalTone || 'neutral';

      // Insert into curatedThoughts
      await connection.query(
        `INSERT INTO curatedThoughts (
          userId, 
          title, 
          content, 
          originalContent, 
          category, 
          sentiment, 
          sourcePrivateThoughtId, 
          commercializationStatus, 
          isApprovedByOwner,
          tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1, // userId
          title,
          thought.content,
          thought.content.substring(0, 500),
          category,
          sentiment,
          thought.id,
          'private',
          false,
          JSON.stringify([category, sentiment]),
        ]
      );

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`  Processed ${successCount}/${thoughts.length}...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  Error processing thought ${thought.id}:`, error.message);
    }
  }

  console.log(`\nInitialization complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);

  // Verify
  const [verifyResult] = await connection.query('SELECT COUNT(*) as count FROM curatedThoughts');
  console.log(`  Total curatedThoughts now: ${verifyResult[0].count}`);

} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
} finally {
  await connection.end();
}
