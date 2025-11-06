const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../mahuti_tasks.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
const initDatabase = () => {
  db.serialize(() => {
    // Staff table with unique name constraint
    db.run(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        role TEXT,
        color TEXT,
        availability TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table with unique name constraint
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        category TEXT,
        color TEXT,
        duration INTEGER DEFAULT 60,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schedules table
    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schedule assignments table
    db.run(`
      CREATE TABLE IF NOT EXISTS schedule_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        time_slot TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `);

    // Templates table
    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        template_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clean up duplicates and insert sample data
    cleanupAndInsertSampleData();
  });
};

const cleanupAndInsertSampleData = () => {
  // Check if staff table is empty
  db.get('SELECT COUNT(*) as count FROM staff', [], (err, row) => {
    if (err) {
      console.error('Error checking staff table:', err);
      return;
    }

    // Only insert sample data if table is empty
    if (row.count === 0) {
      console.log('Database is empty, inserting sample data...');
      insertSampleData();
    } else {
      console.log(`Database already has ${row.count} staff members, skipping sample data insertion.`);
    }
  });
};

const insertSampleData = () => {
  // Sample staff from the reference image with saturated colors for print visibility
  const staff = [
    { name: 'Rocio', color: '#FF6B58' },  // Saturated coral
    { name: 'Ruty', color: '#4A90E2' },   // Saturated blue
    { name: 'Flor', color: '#5FB878' },   // Saturated green
    { name: 'Vivi', color: '#FF8C42' },   // Saturated orange
    { name: 'Amit', color: '#9370DB' },   // Saturated purple
    { name: 'Mayo', color: '#E74B9C' }    // Saturated pink
  ];

  const insertStaffStmt = db.prepare('INSERT OR IGNORE INTO staff (name, color) VALUES (?, ?)');
  staff.forEach(s => insertStaffStmt.run(s.name, s.color));
  insertStaffStmt.finalize();

  // Sample tasks from the reference image with saturated colors for print visibility
  const tasks = [
    { name: 'Lunch', icon: '🌳', category: 'Food', color: '#5FB878' },
    { name: 'Dish', icon: '🥤', category: 'Cleaning', color: '#FF69B4' },
    { name: 'Water', icon: '💧', category: 'Care', color: '#00BCD4' },
    { name: 'Snack', icon: '🍪', category: 'Food', color: '#FF8C42' },
    { name: 'Activities', icon: '🎨', category: 'Activities', color: '#FF6B58' }
  ];

  const insertTaskStmt = db.prepare('INSERT OR IGNORE INTO tasks (name, icon, category, color) VALUES (?, ?, ?, ?)');
  tasks.forEach(t => insertTaskStmt.run(t.name, t.icon, t.category, t.color));
  insertTaskStmt.finalize();
};

initDatabase();

module.exports = db;
