const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating App.jsx...');

// Add handleReorderTasks function after handleDeleteTask
const afterDeleteTask = `  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(\`\${API_URL}/tasks/\${taskId}\`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      // Remove assignments for this task
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].task_id === taskId) {
            delete newAssignments[key];
          }
        });
        return newAssignments;
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };`;

const reorderHandler = `

  const handleReorderTasks = async (taskOrders, newTasksOrder) => {
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

content = content.replace(afterDeleteTask, afterDeleteTask + reorderHandler);

// Update TaskLibrary component call to include onReorderTasks prop
const oldTaskLibraryCall = `          <TaskLibrary
            tasks={tasks}
            staff={staff}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />`;

const newTaskLibraryCall = `          <TaskLibrary
            tasks={tasks}
            staff={staff}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={handleReorderTasks}
          />`;

content = content.replace(oldTaskLibraryCall, newTaskLibraryCall);

fs.writeFileSync(filePath, content, 'utf8');

console.log('App.jsx updated successfully!');
console.log('Changes made:');
console.log('1. Added handleReorderTasks function');
console.log('2. Passed onReorderTasks prop to TaskLibrary');
