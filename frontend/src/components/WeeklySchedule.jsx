import { useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import './WeeklySchedule.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COLORS = ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DAA520', '#4682B4'];

const SATURATED_COLORS = [
  '#FF6B58', '#E74B9C', '#9370DB', '#4A90E2', '#00BCD4', '#20B2AA',
  '#5FB878', '#7FBF3F', '#FFD700', '#FFA500', '#FF8C42', '#DC143C',
  '#BA55D3', '#4682B4', '#32CD32',
];

const EMOJI_CATEGORIES = {
  'Food & Drinks': [
    '🍎', '🍌', '🍇', '🍊', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥',
    '🥕', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥔', '🍅', '🥗',
    '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🍖',
    '🍕', '🍔', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🍝',
    '🍪', '🍰', '🧁', '🍩', '🍦', '🍨', '🧋', '🍫', '🍬', '🍭',
    '🥛', '☕', '🧃', '🥤', '🧉', '🍵', '🧊', '💧', '🍾', '🥂'
  ],
  'Activities': [
    '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🥁',
    '🎮', '🎲', '🎯', '🎳', '🎱', '🏓', '🏸', '🥊', '🎣', '🛹',
    '🧩', '🪀', '🎪', '🎢', '🎡', '🎠', '⚽', '🏀', '🏈', '⚾',
    '🎾', '🏐', '🏉', '🥏', '🎿', '⛸️', '🛷', '🏂', '🏋️', '🤸'
  ],
  'School & Office': [
    '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖍️', '📌', '📎', '✂️',
    '📏', '📐', '📋', '📊', '📈', '📉', '🗂️', '📁', '📂', '🗃️',
    '🖇️', '📆', '📅', '🗓️', '📇', '🗒️', '🗳️', '🖨️', '🖥️', '💻',
    '⌨️', '🖱️', '🖲️', '💾', '💿', '📱', '📞', '☎️', '📠', '🔍'
  ],
  'Celebrations': [
    '🎁', '🎀', '🎈', '🎉', '🎊', '🎂', '🧨', '✨', '🎆', '🎇',
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '💎', '💍', '👍',
    '👏', '🙌', '🤝', '💪', '🦾', '🎯', '🌟', '⭐', '💫', '🔥'
  ],
  'Nature': [
    '🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '🍀', '🍁', '🍂', '🍃',
    '🌻', '🌺', '🌸', '🌼', '🌷', '🌹', '🥀', '🏵️', '💐', '🌱',
    '🪴', '🌾', '🪺', '🍄', '🌰', '🐚', '🪨', '⛰️', '🏔️', '🗻',
    '🌋', '🏕️', '⛺', '🏞️', '🌅', '🌄', '🌠', '🌌', '🌉', '🌁'
  ],
  'Cleaning & Home': [
    '🧹', '🧺', '🧼', '🧽', '🧴', '🧻', '🛁', '🚿', '🚽', '🪠',
    '🧖', '💆', '💇', '🏠', '🏡', '🏘️', '🛋️', '🪑', '🛏️', '🚪',
    '🪟', '🧰', '🔨', '🪛', '🔧', '🪚', '⚒️', '🛠️', '⚙️', '🧲'
  ],
  'Smileys': [
    '😊', '😄', '😁', '😃', '😀', '😍', '🥰', '😘', '😗', '😙',
    '😚', '🤗', '🤩', '😎', '🤓', '🧐', '🤔', '🤨', '😐', '😑',
    '😏', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🤧', '🥵', '🥶', '😇', '🥳', '🥸', '😈', '👿', '💀'
  ],
  'Animals': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
    '🐦', '🐤', '🐣', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
    '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️'
  ]
};

function ScheduleCell({ day, task, staff, assignments, onTaskDrop, onRemoveAssignment, onMoveAssignment, isEditing, onStartEdit, onCancelEdit, onSelectStaff }) {
  const key = `${day}-${task.name}`;
  const assignment = assignments[key];

  // Make the assignment draggable
  const [{ isDragging }, drag] = useDrag({
    type: 'ASSIGNMENT',
    item: () => assignment ? { fromKey: key, assignment } : null,
    canDrag: () => !!assignment,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }, [assignment, key]);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['STAFF', 'ASSIGNMENT'],
    drop: (item) => {
      if (item.staffId) {
        // Dropping a staff member from sidebar
        onTaskDrop(task.id, day, item.staffId);
      } else if (item.fromKey) {
        // Moving an assignment
        onMoveAssignment(item.fromKey, day, task.name);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  // Combine drag and drop refs
  const attachRef = (el) => {
    drag(el);
    drop(el);
  };

  return (
    <td
      ref={attachRef}
      className={`schedule-cell ${isOver && canDrop ? 'drag-over' : ''} ${assignment ? 'has-assignment' : ''} ${isDragging ? 'dragging' : ''} ${isEditing ? 'editing' : ''}`}
      style={{ borderColor: task.color }}
      onClick={() => !assignment && !isEditing && onStartEdit(day, task.name)}
      title={!assignment ? "Click to assign staff" : ""}
    >
      {isEditing ? (
        <div className="staff-selector">
          <select
            className="staff-select"
            onChange={(e) => {
              if (e.target.value) {
                onSelectStaff(day, task.id, parseInt(e.target.value));
              }
            }}
            onBlur={onCancelEdit}
            autoFocus
            defaultValue=""
          >
            <option value="">Select staff...</option>
            {staff.map(s => (
              <option key={s.id} value={s.id} style={{ color: s.color }}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            className="cancel-select-btn"
            onClick={onCancelEdit}
            title="Cancel"
          >
            ✕
          </button>
        </div>
      ) : assignment ? (
        <div className="assignment" style={{ color: assignment.staff.color }}>
          <span>{assignment.staff.name}</span>
          <button
            className="remove-btn"
            onClick={() => onRemoveAssignment(assignment.id)}
            title="Remove assignment"
          >
            ×
          </button>
        </div>
      ) : null}
    </td>
  );
}

function TaskRow({ task, index, visibleDays, staff, assignments, onTaskDrop, onRemoveAssignment, onMoveAssignment, onEditTask, onDeleteTask, onReorderTask, editingCell, onStartCellEdit, onCancelCellEdit, onCellSelectStaff }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK_REORDER',
    item: { taskId: task.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'TASK_REORDER',
    hover: (item) => {
      if (item.index !== index) {
        onReorderTask(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const attachRef = (el) => {
    drag(el);
    drop(el);
  };

  return (
    <tr ref={attachRef} className={`${isDragging ? 'dragging-row' : ''} ${isOver ? 'drag-over-row' : ''}`}>
      <td className="task-name-cell">
        <span className="drag-hint">⇄</span>
        <span className="task-icon">{task.icon}</span>
        <span className="task-name-text">{task.name}</span>
        <div className="task-actions">
          <button
            className="edit-btn-small"
            onClick={() => onEditTask(task)}
            title="Edit task"
          >
            ✏️
          </button>
          <button
            className="delete-btn-small"
            onClick={() => onDeleteTask(task.id)}
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </td>
      {visibleDays.map((day, dayIndex) => {
        const cellKey = `${dayIndex}-${task.name}`;
        return (
          <ScheduleCell
            key={`${task.id}-${dayIndex}`}
            day={dayIndex}
            task={task}
            staff={staff}
            assignments={assignments}
            onTaskDrop={onTaskDrop}
            onRemoveAssignment={onRemoveAssignment}
            onMoveAssignment={onMoveAssignment}
            isEditing={editingCell === cellKey}
            onStartEdit={onStartCellEdit}
            onCancelEdit={onCancelCellEdit}
            onSelectStaff={onCellSelectStaff}
          />
        );
      })}
    </tr>
  );
}

function WeeklySchedule({
  tasks,
  staff,
  assignments,
  weekStartDate,
  showDays,
  onNavigateWeek,
  onShowDaysChange,
  onTaskDrop,
  onRemoveAssignment,
  onMoveAssignment,
  onClearWeek,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskName, setTaskName] = useState('');
  const [taskIcon, setTaskIcon] = useState('');
  const [taskCategory, setTaskCategory] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('Food & Drinks');
  const [editingCell, setEditingCell] = useState(null);

  const visibleDays = DAYS.slice(0, showDays);

  // Format the week range for display
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (showDays - 1));
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const handleReorderTask = (fromIndex, toIndex) => {
    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, movedTask);

    const taskOrders = newTasks.map((task, idx) => ({
      id: task.id,
      order_index: idx
    }));

    onReorderTasks(taskOrders, newTasks);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setTaskIcon(task.icon);
    setTaskCategory(task.category || '');
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setTaskName('');
    setTaskIcon('');
    setTaskCategory('');
    setShowAddForm(false);
    setShowEmojiPicker(false);
    setSelectedEmojiCategory('Food & Drinks');
  };

  // Get emojis from selected category
  const getFilteredEmojis = () => {
    return EMOJI_CATEGORIES[selectedEmojiCategory] || [];
  };

  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (taskName.trim() && taskIcon.trim()) {
      if (editingTask) {
        onUpdateTask(editingTask.id, {
          name: taskName.trim(),
          icon: taskIcon.trim(),
          category: taskCategory.trim() || 'General',
          color: editingTask.color
        });
      } else {
        onAddTask({
          name: taskName.trim(),
          icon: taskIcon.trim(),
          category: taskCategory.trim() || 'General',
          color: SATURATED_COLORS[Math.floor(Math.random() * SATURATED_COLORS.length)]
        });
      }
      handleCancelEdit();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setTaskIcon(emoji);
    setShowEmojiPicker(false);
  };

  const handleStartCellEdit = (day, taskName) => {
    setEditingCell(`${day}-${taskName}`);
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
  };

  const handleCellSelectStaff = (day, taskId, staffId) => {
    onTaskDrop(taskId, day, staffId);
    setEditingCell(null);
  };

  return (
    <div className="weekly-schedule">
      <div className="schedule-controls">
        <div className="controls-group">
          <label>Week:</label>
          <div className="week-navigation">
            <button
              className="nav-btn"
              onClick={() => onNavigateWeek(-1)}
              title="Previous week"
            >
              ← Prev
            </button>
            <span className="week-display">{weekRange}</span>
            <button
              className="nav-btn"
              onClick={() => onNavigateWeek(1)}
              title="Next week"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="controls-group">
          <label>Days:</label>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${showDays === 5 ? 'active' : ''}`}
              onClick={() => onShowDaysChange(5)}
            >
              5 Days
            </button>
            <button
              className={`toggle-btn ${showDays === 6 ? 'active' : ''}`}
              onClick={() => onShowDaysChange(6)}
            >
              6 Days
            </button>
          </div>
        </div>
      </div>

      <table className="schedule-table">
        <thead>
          <tr>
            <th className="task-header">
              <div className="task-header-content">
                <span>Task/Day</span>
                <button
                  className="add-task-btn"
                  onClick={() => {
                    if (showAddForm && !editingTask) {
                      handleCancelEdit();
                    } else {
                      setShowAddForm(!showAddForm);
                    }
                  }}
                  title="Add new task"
                >
                  {showAddForm ? '✕' : '+ Add Task'}
                </button>
              </div>
            </th>
            {visibleDays.map((day, index) => (
              <th key={day} style={{ color: DAY_COLORS[index] }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showAddForm && (
            <tr className="add-task-row">
              <td colSpan={showDays + 1}>
                <form className="inline-task-form" onSubmit={handleSubmitTask}>
                  <div className="form-row">
                    <div className="emoji-input-wrapper">
                      <input
                        type="text"
                        placeholder="Emoji (e.g., 🍎)"
                        value={taskIcon}
                        onChange={(e) => setTaskIcon(e.target.value)}
                        className="emoji-input"
                        required
                      />
                      <button
                        type="button"
                        className="emoji-picker-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Choose emoji"
                      >
                        😊
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Task name"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="task-name-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Category (optional)"
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="category-input"
                    />
                    <div className="form-actions-inline">
                      <button type="submit" className="submit-btn-inline">
                        {editingTask ? 'Update' : 'Add'}
                      </button>
                      <button type="button" className="cancel-btn-inline" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                  {showEmojiPicker && (
                    <div className="emoji-picker-inline">
                      <div className="emoji-categories">
                        {Object.keys(EMOJI_CATEGORIES).map((category) => (
                          <button
                            key={category}
                            type="button"
                            className={`emoji-category-btn ${selectedEmojiCategory === category ? 'active' : ''}`}
                            onClick={() => setSelectedEmojiCategory(category)}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="emoji-grid">
                        {getFilteredEmojis().map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            className="emoji-option"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </td>
            </tr>
          )}
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              visibleDays={visibleDays}
              staff={staff}
              assignments={assignments}
              onTaskDrop={onTaskDrop}
              onRemoveAssignment={onRemoveAssignment}
              onMoveAssignment={onMoveAssignment}
              onEditTask={handleEditTask}
              onDeleteTask={onDeleteTask}
              onReorderTask={handleReorderTask}
              editingCell={editingCell}
              onStartCellEdit={handleStartCellEdit}
              onCancelCellEdit={handleCancelCellEdit}
              onCellSelectStaff={handleCellSelectStaff}
            />
          ))}
        </tbody>
      </table>

      <div className="schedule-footer">
        <button
          className="undo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last action"
        >
          ↶ Undo
        </button>
        <button
          className="clear-week-btn"
          onClick={onClearWeek}
          title="Clear all assignments for this week"
        >
          🗑️ Clear This Week
        </button>
        <button
          className="redo-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo last undone action"
        >
          ↷ Redo
        </button>
      </div>
    </div>
  );
}

export default WeeklySchedule;
