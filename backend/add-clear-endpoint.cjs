const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding clear schedule endpoint...');

// Add the clear schedule assignments endpoint after DELETE /api/assignments/:id
const afterDeleteAssignment = `app.delete('/api/assignments/:id', (req, res) => {
  db.run('DELETE FROM schedule_assignments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Assignment deleted successfully' });
  });
});`;

const clearEndpoint = `

// Clear all assignments for a schedule
app.delete('/api/schedules/:id/assignments', (req, res) => {
  const scheduleId = req.params.id;

  db.run('DELETE FROM schedule_assignments WHERE schedule_id = ?', [scheduleId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      message: 'All assignments cleared successfully',
      deletedCount: this.changes
    });
  });
});`;

content = content.replace(afterDeleteAssignment, afterDeleteAssignment + clearEndpoint);

fs.writeFileSync(filePath, content, 'utf8');

console.log('Clear schedule endpoint added successfully!');
console.log('Added: DELETE /api/schedules/:id/assignments');
