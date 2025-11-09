const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mahuti_tasks.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding order_index column to tasks table...');

db.serialize(() => {
  // Add order_index column if it doesn't exist
  db.run(`ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding order_index column:', err);
      return;
    }
    if (err) {
      console.log('order_index column already exists');
    } else {
      console.log('order_index column added successfully');
    }

    // Populate order_index based on current task id order
    db.all('SELECT id FROM tasks ORDER BY id', [], (err, rows) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return;
      }

      const updateStmt = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');
      rows.forEach((row, index) => {
        updateStmt.run(index, row.id);
      });
      updateStmt.finalize(() => {
        console.log(`Updated ${rows.length} tasks with order_index values`);

        // Verify the update
        db.all('SELECT id, name, order_index FROM tasks ORDER BY order_index', [], (err, tasks) => {
          if (err) {
            console.error('Error verifying tasks:', err);
          } else {
            console.log('\nCurrent task order:');
            tasks.forEach(task => {
              console.log(`  ${task.order_index}: ${task.name} (id: ${task.id})`);
            });
          }
          db.close();
        });
      });
    });
  });
});
