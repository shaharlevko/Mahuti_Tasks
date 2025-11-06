const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mahuti_tasks.db');
const db = new sqlite3.Database(dbPath);

console.log('Updating colors to saturated for better print visibility...');

// Update staff colors to saturated
const staffColors = {
  'Rocio': '#FF6B58',  // Saturated coral
  'Ruty': '#4A90E2',   // Saturated blue
  'Flor': '#5FB878',   // Saturated green
  'Vivi': '#FF8C42',   // Saturated orange
  'Amit': '#9370DB',   // Saturated purple
  'Mayo': '#E74B9C'    // Saturated pink
};

// Update task colors to saturated
const taskColors = {
  'Lunch': '#5FB878',    // Saturated green
  'Dish': '#FF69B4',     // Saturated hot pink
  'Water': '#00BCD4',    // Saturated cyan
  'Snack': '#FF8C42',    // Saturated orange
  'Activities': '#FF6B58' // Saturated coral
};

let updates = 0;

// Update staff colors
Object.entries(staffColors).forEach(([name, color]) => {
  db.run('UPDATE staff SET color = ? WHERE name = ?', [color, name], function(err) {
    if (err) {
      console.error(`Error updating ${name}:`, err);
    } else if (this.changes > 0) {
      console.log(`Updated ${name} to ${color}`);
      updates++;
    }
  });
});

// Update task colors
Object.entries(taskColors).forEach(([name, color]) => {
  db.run('UPDATE tasks SET color = ? WHERE name = ?', [color, name], function(err) {
    if (err) {
      console.error(`Error updating ${name}:`, err);
    } else if (this.changes > 0) {
      console.log(`Updated ${name} to ${color}`);
      updates++;
    }
  });
});

// Wait a bit for all updates to complete
setTimeout(() => {
  console.log(`\nUpdate complete! ${updates} items updated.`);
  db.close();
}, 1000);
