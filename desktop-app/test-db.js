const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'app-finanalysis.sqlite');
const db = new Database(dbPath);
console.log('DB tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
try {
  db.exec("ALTER TABLE api_keys ADD COLUMN model_name TEXT");
  console.log('Added model_name column successfully');
} catch (err) {
  console.log('Column might already exist:', err.message);
}
console.log('Columns in api_keys:', db.prepare("PRAGMA table_info(api_keys)").all());
db.close();
