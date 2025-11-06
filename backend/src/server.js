const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Staff endpoints
app.get('/api/staff', (req, res) => {
  db.all('SELECT * FROM staff ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/staff', (req, res) => {
  const { name, role, color } = req.body;
  db.run(
    'INSERT INTO staff (name, role, color) VALUES (?, ?, ?)',
    [name, role, color],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, role, color });
    }
  );
});

app.put('/api/staff/:id', (req, res) => {
  const { name, role, color } = req.body;
  db.run(
    'UPDATE staff SET name = ?, role = ?, color = ? WHERE id = ?',
    [name, role, color, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, role, color });
    }
  );
});

app.delete('/api/staff/:id', (req, res) => {
  db.run('DELETE FROM staff WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Staff deleted successfully' });
  });
});

// Tasks endpoints
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY category, name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks', (req, res) => {
  const { name, icon, category, color } = req.body;
  db.run(
    'INSERT INTO tasks (name, icon, category, color) VALUES (?, ?, ?, ?)',
    [name, icon, category, color],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, icon, category, color });
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { name, icon, category, color } = req.body;
  db.run(
    'UPDATE tasks SET name = ?, icon = ?, category = ?, color = ? WHERE id = ?',
    [name, icon, category, color, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, icon, category, color });
    }
  );
});

app.delete('/api/tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Task deleted successfully' });
  });
});

// Schedules endpoints
app.get('/api/schedules', (req, res) => {
  db.all('SELECT * FROM schedules ORDER BY week_start DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/schedules/:id', (req, res) => {
  db.get('SELECT * FROM schedules WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Schedule not found' });

    // Get assignments for this schedule
    db.all(
      `SELECT sa.*, t.name as task_name, t.icon as task_icon, t.color as task_color,
              s.name as staff_name, s.color as staff_color
       FROM schedule_assignments sa
       JOIN tasks t ON sa.task_id = t.id
       JOIN staff s ON sa.staff_id = s.id
       WHERE sa.schedule_id = ?`,
      [req.params.id],
      (err, assignments) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...row, assignments });
      }
    );
  });
});

app.post('/api/schedules', (req, res) => {
  const { week_start, week_end, name } = req.body;
  db.run(
    'INSERT INTO schedules (week_start, week_end, name) VALUES (?, ?, ?)',
    [week_start, week_end, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, week_start, week_end, name });
    }
  );
});

app.put('/api/schedules/:id', (req, res) => {
  const { name } = req.body;
  db.run(
    'UPDATE schedules SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name });
    }
  );
});

app.delete('/api/schedules/:id', (req, res) => {
  db.run('DELETE FROM schedules WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Schedule deleted successfully' });
  });
});

// Schedule assignments endpoints
app.post('/api/assignments', (req, res) => {
  const { schedule_id, task_id, staff_id, day_of_week, time_slot, notes } = req.body;

  // Check for conflicts
  db.get(
    'SELECT * FROM schedule_assignments WHERE schedule_id = ? AND staff_id = ? AND day_of_week = ? AND time_slot = ?',
    [schedule_id, staff_id, day_of_week, time_slot],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing) {
        return res.status(409).json({ error: 'Conflict: Staff member already assigned at this time' });
      }

      db.run(
        'INSERT INTO schedule_assignments (schedule_id, task_id, staff_id, day_of_week, time_slot, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [schedule_id, task_id, staff_id, day_of_week, time_slot, notes],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, schedule_id, task_id, staff_id, day_of_week, time_slot, notes });
        }
      );
    }
  );
});

app.put('/api/assignments/:id', (req, res) => {
  const { task_id, staff_id, day_of_week, time_slot, notes } = req.body;
  db.run(
    'UPDATE schedule_assignments SET task_id = ?, staff_id = ?, day_of_week = ?, time_slot = ?, notes = ? WHERE id = ?',
    [task_id, staff_id, day_of_week, time_slot, notes, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, task_id, staff_id, day_of_week, time_slot, notes });
    }
  );
});

app.delete('/api/assignments/:id', (req, res) => {
  db.run('DELETE FROM schedule_assignments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Assignment deleted successfully' });
  });
});

// Templates endpoints
app.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM templates ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({
      ...row,
      template_data: JSON.parse(row.template_data)
    })));
  });
});

app.post('/api/templates', (req, res) => {
  const { name, description, template_data } = req.body;
  db.run(
    'INSERT INTO templates (name, description, template_data) VALUES (?, ?, ?)',
    [name, description, JSON.stringify(template_data)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description, template_data });
    }
  );
});

app.delete('/api/templates/:id', (req, res) => {
  db.run('DELETE FROM templates WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Template deleted successfully' });
  });
});

// Cleanup endpoint to remove duplicates
app.post('/api/cleanup', (req, res) => {
  // Remove duplicate staff members, keeping only the first occurrence
  db.run(`
    DELETE FROM staff
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM staff
      GROUP BY name
    )
  `, (err) => {
    if (err) {
      console.error('Error cleaning up staff duplicates:', err);
      return res.status(500).json({ error: err.message });
    }

    // Remove duplicate tasks, keeping only the first occurrence
    db.run(`
      DELETE FROM tasks
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM tasks
        GROUP BY name
      )
    `, (err) => {
      if (err) {
        console.error('Error cleaning up task duplicates:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: 'Database cleanup completed successfully',
        note: 'Duplicate staff and tasks have been removed'
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Mahuti Tasks API running on http://localhost:${PORT}`);
});

 
