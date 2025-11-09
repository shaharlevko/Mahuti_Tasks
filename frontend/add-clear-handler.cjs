const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding handleClearWeek function to App.jsx...');

// Add handleClearWeek after handleReorderTasks
const afterReorderHandler = `  const handleReorderTasks = async (taskOrders, newTasksOrder) => {
    try {
      // Optimistically update UI
      setTasks(newTasksOrder);

      // Persist to backend
      await axios.put(\`\${API_URL}/tasks/reorder\`, { taskOrders });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      alert('Failed to reorder tasks');
      // Reload tasks from server on error
      const response = await axios.get(\`\${API_URL}/tasks\`);
      setTasks(response.data);
    }
  };`;

const clearHandler = `

  const handleClearWeek = async () => {
    if (!currentSchedule) return;

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to clear this week?');

    if (!confirmed) {
      return; // User clicked "No" - cancel the operation
    }

    try {
      // User clicked "Yes" - proceed with clearing
      await axios.delete(\`\${API_URL}/schedules/\${currentSchedule.id}/assignments\`);

      // Clear local state
      setAssignments({});

      alert('Week cleared successfully!');
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week. Please try again.');
    }
  };`;

content = content.replace(afterReorderHandler, afterReorderHandler + clearHandler);

// Add onClearWeek prop to WeeklySchedule component
const oldWeeklySchedule = `          <WeeklySchedule
            tasks={tasks}
            staff={staff}
            assignments={assignments}
            weekStartDate={weekStartDate}
            showDays={showDays}
            onNavigateWeek={navigateWeek}
            onShowDaysChange={setShowDays}
            onTaskDrop={handleTaskDrop}
            onRemoveAssignment={handleRemoveAssignment}
            onMoveAssignment={handleMoveAssignment}
          />`;

const newWeeklySchedule = `          <WeeklySchedule
            tasks={tasks}
            staff={staff}
            assignments={assignments}
            weekStartDate={weekStartDate}
            showDays={showDays}
            onNavigateWeek={navigateWeek}
            onShowDaysChange={setShowDays}
            onTaskDrop={handleTaskDrop}
            onRemoveAssignment={handleRemoveAssignment}
            onMoveAssignment={handleMoveAssignment}
            onClearWeek={handleClearWeek}
          />`;

content = content.replace(oldWeeklySchedule, newWeeklySchedule);

fs.writeFileSync(filePath, content, 'utf8');

console.log('App.jsx updated successfully!');
console.log('Added:');
console.log('1. handleClearWeek function with confirmation dialog');
console.log('2. onClearWeek prop to WeeklySchedule');
