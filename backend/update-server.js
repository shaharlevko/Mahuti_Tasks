const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Updating server.js...');

// Update GET /api/tasks to order by order_index
content = content.replace(
  "db.all('SELECT * FROM tasks ORDER BY category, name',",
  "db.all('SELECT * FROM tasks ORDER BY order_index, id',"
);

// Update POST /api/tasks to include order_index
const oldPostTasks = `app.post('/api/tasks', (req, res) => {
  const { name, icon, category, color } = req.body;
  db.run(
    'INSERT INTO tasks (name, icon, category, color) VALUES (?, ?, ?, ?)',
    [name, icon, category, color],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, icon, category, color });
    }
  );
});`;

const newPostTasks = `app.post('/api/tasks', (req, res) => {
  const { name, icon, category, color } = req.body;

  // Get the highest order_index and set new task to be last
  db.get('SELECT MAX(order_index) as max_order FROM tasks', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const newOrderIndex = (row.max_order || -1) + 1;

    db.run(
      'INSERT INTO tasks (name, icon, category, color, order_index) VALUES (?, ?, ?, ?, ?)',
      [name, icon, category, color, newOrderIndex],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, icon, category, color, order_index: newOrderIndex });
      }
    );
  });
});`;

content = content.replace(oldPostTasks, newPostTasks);

// Add reorder endpoint after PUT /api/tasks/:id
const insertAfter = `app.put('/api/tasks/:id', (req, res) => {
  const { name, icon, category, color } = req.body;
  db.run(
    'UPDATE tasks SET name = ?, icon = ?, category = ?, color = ? WHERE id = ?',
    [name, icon, category, color, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, icon, category, color });
    }
  );
});`;

const reorderEndpoint = `

// Reorder tasks endpoint
app.put('/api/tasks/reorder', (req, res) => {
  const { taskOrders } = req.body; // Array of { id, order_index }

  if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
    return res.status(400).json({ error: 'taskOrders must be a non-empty array' });
  }

  // Update all tasks with their new order_index values
  const updateStmt = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');

  let completed = 0;
  let errors = [];

  taskOrders.forEach(({ id, order_index }) => {
    updateStmt.run(order_index, id, (err) => {
      if (err) errors.push(err);
      completed++;

      if (completed === taskOrders.length) {
        updateStmt.finalize();

        if (errors.length > 0) {
          return res.status(500).json({ error: 'Some updates failed', details: errors });
        }

        res.json({ message: 'Task order updated successfully', count: taskOrders.length });
      }
    });
  });
});`;

content = content.replace(insertAfter, insertAfter + reorderEndpoint);

fs.writeFileSync(serverPath, content, 'utf8');

console.log('server.js updated successfully!');
console.log('Changes made:');
console.log('1. GET /api/tasks now orders by order_index');
console.log('2. POST /api/tasks now sets order_index for new tasks');
console.log('3. Added PUT /api/tasks/reorder endpoint');
