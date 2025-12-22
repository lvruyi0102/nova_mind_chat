import fs from 'fs';
import path from 'path';

// Update the journal to only include migrations that exist
const journalPath = './drizzle/meta/_journal.json';
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

// Get list of existing SQL files
const drizzleDir = './drizzle';
const existingFiles = fs.readdirSync(drizzleDir)
  .filter(f => f.match(/^\d{4}_.*\.sql$/))
  .map(f => f.replace('.sql', ''));

console.log('Existing migration files:', existingFiles);

// Filter journal entries to only include existing migrations
const filteredEntries = journal.entries.filter(entry => {
  const tag = entry.tag;
  return existingFiles.includes(tag);
});

console.log('Filtered entries:', filteredEntries.map(e => e.tag));

// Update journal
journal.entries = filteredEntries;
fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

console.log('✓ Journal updated');
