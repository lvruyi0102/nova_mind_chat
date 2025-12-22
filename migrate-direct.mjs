import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

// Parse the connection string
const url = new URL(connectionString);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: 'Amazon RDS' in url.hostname ? { rejectUnauthorized: false } : undefined,
};

async function executeMigrations() {
  const connection = await mysql.createConnection(config);
  
  try {
    // Read and execute the migration file
    const migrationPath = path.join(process.cwd(), 'drizzle/migrations/0010_blue_bruce_banner.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by statement-breakpoint and execute each statement
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    for (const statement of statements) {
      if (statement) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        try {
          await connection.execute(statement);
          console.log('✓ Success');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('✓ Table already exists');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } finally {
    await connection.end();
  }
}

executeMigrations().catch(console.error);
