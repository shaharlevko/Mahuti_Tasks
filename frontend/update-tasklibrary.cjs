const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TaskLibrary.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating TaskLibrary.jsx...');

// Replace the DraggableStaff component implementation (keep the component but update task rendering)
// Find and replace the task rendering section

const oldTaskRendering = `        <div className="task-icons">
          {tasks.map(task => (
            <div key={task.id} className="task-info-item">
              <span className="task-icon">{task.icon}</span>
              <span>{task.name}</span>
              <button
                className="delete-btn-small"
                onClick={() => onDeleteTask(task.id)}
                title="Delete task"
              >
                ✕
              </button>
            </div>
          ))}
        </div>`;

const newTaskRendering = `        <div className="task-icons">
          {tasks.map((task, index) => (
            <DraggableTask
              key={task.id}
              task={task}
              index={index}
              onDelete={onDeleteTask}
              onReorder={handleReorderTask}
            />
          ))}
        </div>`;

content = content.replace(oldTaskRendering, newTaskRendering);

// Add DraggableTask component before the TaskLibrary function
const draggableTaskComponent = `
function DraggableTask({ task, index, onDelete, onReorder }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK_REORDER',
    item: { taskId: task.id, index, task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'TASK_REORDER',
    hover: (item) => {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  // Combine drag and drop refs
  const attachRef = (el) => {
    drag(el);
    drop(el);
  };

  return (
    <div
      ref={attachRef}
      className={\`task-info-item \${isDragging ? 'dragging' : ''} \${isOver ? 'drag-over' : ''}\`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <span className="drag-hint">⇄</span>
      <span className="task-icon">{task.icon}</span>
      <span>{task.name}</span>
      <button
        className="delete-btn-small"
        onClick={() => onDelete(task.id)}
        title="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
`;

// Insert DraggableTask before TaskLibrary function
content = content.replace(
  'function TaskLibrary(',
  draggableTaskComponent + '\nfunction TaskLibrary('
);

// Add handleReorderTask function inside TaskLibrary component, after showEmojiPicker state
const afterState = `  const [showEmojiPicker, setShowEmojiPicker] = useState(false);`;

const reorderHandler = `

  const handleReorderTask = (fromIndex, toIndex) => {
    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, movedTask);

    // Update task orders in backend
    const taskOrders = newTasks.map((task, idx) => ({
      id: task.id,
      order_index: idx
    }));

    onReorderTasks(taskOrders, newTasks);
  };`;

content = content.replace(afterState, afterState + reorderHandler);

// Update the function signature to include onReorderTasks
content = content.replace(
  'function TaskLibrary({ tasks, staff, onAddStaff, onUpdateStaff, onDeleteStaff, onAddTask, onDeleteTask }) {',
  'function TaskLibrary({ tasks, staff, onAddStaff, onUpdateStaff, onDeleteStaff, onAddTask, onDeleteTask, onReorderTasks }) {'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('TaskLibrary.jsx updated successfully!');
console.log('Changes made:');
console.log('1. Added DraggableTask component for reorderable tasks');
console.log('2. Added handleReorderTask function');
console.log('3. Added onReorderTasks prop');
console.log('4. Updated task rendering to use DraggableTask');
