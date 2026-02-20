const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'app-finanalysis.sqlite');
const db = new Database(dbPath);
console.log('--- api_keys ---');
console.log(db.prepare("SELECT * FROM api_keys").all());
console.log('--- app_config ---');
console.log(db.prepare("SELECT * FROM app_config").all());
db.close();
