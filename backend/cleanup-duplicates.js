const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mahuti_tasks.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting database cleanup...');

// Remove duplicate staff members, keeping only the first occurrence
db.run(`
  DELETE FROM staff
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM staff
    GROUP BY name
  )
`, function(err) {
  if (err) {
    console.error('Error cleaning up staff duplicates:', err);
  } else {
    console.log(`Removed ${this.changes} duplicate staff members`);
  }

  // Remove duplicate tasks, keeping only the first occurrence
  db.run(`
    DELETE FROM tasks
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM tasks
      GROUP BY name
    )
  `, function(err) {
    if (err) {
      console.error('Error cleaning up task duplicates:', err);
    } else {
      console.log(`Removed ${this.changes} duplicate tasks`);
    }

    // Show remaining staff and tasks
    db.all('SELECT id, name, color FROM staff ORDER BY name', [], (err, staff) => {
      if (err) {
        console.error('Error fetching staff:', err);
      } else {
        console.log('\nRemaining staff members:');
        staff.forEach(s => console.log(`  ${s.id}: ${s.name} (${s.color})`));
      }

      db.all('SELECT id, name, icon, color FROM tasks ORDER BY name', [], (err, tasks) => {
        if (err) {
          console.error('Error fetching tasks:', err);
        } else {
          console.log('\nRemaining tasks:');
          tasks.forEach(t => console.log(`  ${t.id}: ${t.icon} ${t.name} (${t.color})`));
        }

        console.log('\nCleanup complete!');
        db.close();
      });
    });
  });
});
