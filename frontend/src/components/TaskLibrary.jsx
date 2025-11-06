import { useState } from 'react';
import { useDrag } from 'react-dnd';
import './TaskLibrary.css';

const SATURATED_COLORS = [
  '#FF6B58', // Saturated coral
  '#E74B9C', // Saturated pink
  '#4A90E2', // Saturated blue
  '#FFD700', // Saturated gold
  '#5FB878', // Saturated green
  '#9370DB', // Saturated purple
  '#FF8C42', // Saturated orange
  '#FF69B4', // Saturated hot pink
  '#00BCD4', // Saturated cyan
];

function DraggableStaff({ staff, onDelete, onEdit }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'STAFF',
    item: { staffId: staff.id, name: staff.name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`staff-item ${isDragging ? 'dragging' : ''}`}
      style={{
        borderLeft: `4px solid ${staff.color}`,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <span className="staff-name" style={{ color: staff.color }}>
        {staff.name}
      </span>
      <div className="staff-actions">
        <span className="drag-hint">⇄</span>
        <button
          className="edit-btn"
          onClick={() => onEdit(staff)}
          title="Edit staff member"
        >
          ✏️
        </button>
        <button
          className="delete-btn"
          onClick={() => onDelete(staff.id)}
          title="Delete staff member"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function TaskLibrary({ tasks, staff, onAddStaff, onUpdateStaff, onDeleteStaff, onAddTask, onDeleteTask }) {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffColor, setNewStaffColor] = useState(SATURATED_COLORS[0]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaffName(staffMember.name);
    setNewStaffColor(staffMember.color);
    setShowStaffForm(true);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (newStaffName.trim()) {
      if (editingStaff) {
        // Update existing staff
        onUpdateStaff(editingStaff.id, {
          name: newStaffName.trim(),
          color: newStaffColor
        });
        setEditingStaff(null);
      } else {
        // Add new staff
        onAddStaff({
          name: newStaffName.trim(),
          color: newStaffColor
        });
      }
      setNewStaffName('');
      setNewStaffColor(SATURATED_COLORS[0]);
      setShowStaffForm(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setNewStaffName('');
    setNewStaffColor(SATURATED_COLORS[0]);
    setShowStaffForm(false);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskName.trim() && newTaskIcon.trim()) {
      onAddTask({
        name: newTaskName.trim(),
        icon: newTaskIcon.trim(),
        category: newTaskCategory.trim() || 'General',
        color: SATURATED_COLORS[Math.floor(Math.random() * SATURATED_COLORS.length)]
      });
      setNewTaskName('');
      setNewTaskIcon('');
      setNewTaskCategory('');
      setShowTaskForm(false);
    }
  };

  return (
    <div className="task-library">
      <div className="library-section">
        <div className="section-header">
          <h2>Staff Members</h2>
          <button
            className="add-btn"
            onClick={() => {
              if (showStaffForm && !editingStaff) {
                setShowStaffForm(false);
              } else {
                handleCancelEdit();
                setShowStaffForm(!showStaffForm);
              }
            }}
          >
            {showStaffForm ? '✕' : '+ Add Staff'}
          </button>
        </div>

        {showStaffForm && (
          <form className="add-form" onSubmit={handleSaveStaff}>
            <h3 className="form-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            <input
              type="text"
              placeholder="Staff name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              required
            />
            <div className="color-picker">
              <label>Color:</label>
              <div className="color-options">
                {SATURATED_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${newStaffColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStaffColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingStaff ? 'Update' : 'Add'}
              </button>
              {editingStaff && (
                <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <p className="library-hint">Drag staff to assign tasks</p>
        <div className="staff-list">
          {staff.map(s => (
            <DraggableStaff
              key={s.id}
              staff={s}
              onEdit={handleEditStaff}
              onDelete={onDeleteStaff}
            />
          ))}
        </div>
      </div>

      <div className="library-section">
        <div className="section-header">
          <h3>Available Tasks</h3>
          <button
            className="add-btn"
            onClick={() => setShowTaskForm(!showTaskForm)}
          >
            {showTaskForm ? '✕' : '+ Add Task'}
          </button>
        </div>

        {showTaskForm && (
          <form className="add-form" onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Task name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Emoji icon (e.g., 🍎)"
              value={newTaskIcon}
              onChange={(e) => setNewTaskIcon(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value)}
            />
            <button type="submit" className="submit-btn">Add Task</button>
          </form>
        )}

        <div className="task-icons">
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
        </div>
      </div>
    </div>
  );
}

export default TaskLibrary;
