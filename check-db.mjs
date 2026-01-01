import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'nova_mind',
});

const [tables] = await connection.query('SHOW TABLES');
console.log('数据库表列表:');
tables.forEach(t => console.log('  -', Object.values(t)[0]));

await connection.end();
