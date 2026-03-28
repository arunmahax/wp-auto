const { sequelize } = require('../src/models');

async function fixDb() {
  try {
    // List all tables
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in DB:', tables.map(t => t.name));
    
    // Drop any backup tables
    const backupTables = tables.filter(t => t.name.includes('_backup'));
    console.log('Backup tables to drop:', backupTables.map(t => t.name));
    
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    for (const t of backupTables) {
      await sequelize.query(`DROP TABLE IF EXISTS "${t.name}";`);
      console.log('Dropped:', t.name);
    }
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixDb();
