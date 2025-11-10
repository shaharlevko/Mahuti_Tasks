import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useClickOutside } from '../hooks/useClickOutside';
import './MobileScheduleView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function MobileScheduleView({
  tasks,
  staff,
  assignments,
  weekStartDate,
  showDays,
  onNavigateWeek,
  onTaskDrop,
  onRemoveAssignment,
  onClearWeek,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onShowPrintView,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showStaffManager, setShowStaffManager] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);

  // Ref for click-outside detection on mobile menu
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  const visibleDays = DAYS.slice(0, showDays);

  // Format the week range for display
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (showDays - 1));
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const handleTaskClick = (task, day) => {
    setSelectedTaskForAssignment({ task, day });
    setShowStaffSelector(true);
  };

  const handleStaffSelect = (staffId) => {
    if (selectedTaskForAssignment) {
      // Convert day index to day name (e.g., 0 -> "Sunday")
      const dayName = DAYS[selectedTaskForAssignment.day];
      onTaskDrop(
        selectedTaskForAssignment.task.id,
        dayName,
        staffId
      );
    }
    setShowStaffSelector(false);
    setSelectedTaskForAssignment(null);
  };

  const handleRemoveAssignment = (assignmentId) => {
    if (window.confirm('Remove this assignment?')) {
      onRemoveAssignment(assignmentId);
    }
  };

  const getAssignmentForTask = (task, dayIndex) => {
    // Convert day index to day name (e.g., 0 -> "Sunday")
    const dayName = DAYS[dayIndex];
    const key = `${dayName}-${task.name}`;
    return assignments[key];
  };

  const handleClearWeek = () => {
    if (window.confirm('Clear all assignments for this week?')) {
      onClearWeek();
    }
  };

  const getTodayDate = () => {
    const today = new Date(weekStart);
    today.setDate(today.getDate() + selectedDay);
    return today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="mobile-schedule-view">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-top">
          <div className="header-title">
            <span className="flower-icon-mobile">🌻</span>
            <h1>Mahuti Schedule</h1>
          </div>
          <button
            className="menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMenu && (
          <div className="mobile-menu" ref={menuRef}>
            <button onClick={() => { setShowStaffManager(true); setShowMenu(false); }}>
              👥 Manage Staff
            </button>
            <button onClick={() => { setShowTaskManager(true); setShowMenu(false); }}>
              📋 Manage Tasks
            </button>
            <button onClick={() => { onShowPrintView(); setShowMenu(false); }}>
              🖨️ Print Schedule
            </button>
            <button
              onClick={() => { handleClearWeek(); setShowMenu(false); }}
              className="danger-btn"
            >
              🗑️ Clear Week
            </button>
          </div>
        )}

        {/* Week Navigation */}
        <div className="mobile-week-nav">
          <button
            className="week-nav-btn"
            onClick={() => onNavigateWeek(-1)}
          >
            ←
          </button>
          <span className="week-range">{weekRange}</span>
          <button
            className="week-nav-btn"
            onClick={() => onNavigateWeek(1)}
          >
            →
          </button>
        </div>

        {/* Day Tabs */}
        <div className="day-tabs">
          {visibleDays.map((day, index) => (
            <button
              key={day}
              className={`day-tab ${selectedDay === index ? 'active' : ''}`}
              onClick={() => setSelectedDay(index)}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>

        <div className="current-date">
          {getTodayDate()}
        </div>
      </header>

      {/* Task List for Selected Day */}
      <div className="mobile-task-list">
        {tasks.map((task) => {
          const assignment = getAssignmentForTask(task, selectedDay);

          return (
            <div key={task.id} className="mobile-task-card">
              <div className="task-card-header" style={{ borderLeftColor: task.color }}>
                <span className="task-icon-mobile">{task.icon}</span>
                <span className="task-name-mobile">{task.name}</span>
              </div>

              {assignment ? (
                <div className="task-card-assignment">
                  <div className="assigned-staff" style={{ color: assignment.staff.color }}>
                    <span className="staff-avatar" style={{ backgroundColor: assignment.staff.color }}>
                      {assignment.staff.name.charAt(0)}
                    </span>
                    <span className="staff-name-mobile">{assignment.staff.name}</span>
                  </div>
                  <div className="assignment-actions">
                    <button
                      className="change-btn"
                      onClick={() => handleTaskClick(task, selectedDay)}
                    >
                      Change
                    </button>
                    <button
                      className="remove-btn-mobile"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="assign-staff-btn"
                  onClick={() => handleTaskClick(task, selectedDay)}
                >
                  + Assign Staff
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Undo/Redo Floating Buttons */}
      <div className="mobile-floating-actions">
        <button
          className="floating-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          ↶
        </button>
        <button
          className="floating-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          ↷
        </button>
      </div>

      {/* Staff Selector Bottom Sheet */}
      {showStaffSelector && (
        <div className="bottom-sheet-overlay" onClick={() => setShowStaffSelector(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>Select Staff Member</h3>
              <button
                className="close-sheet-btn"
                onClick={() => setShowStaffSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="staff-selector-list">
              {staff.map((s) => (
                <button
                  key={s.id}
                  className="staff-selector-item"
                  onClick={() => handleStaffSelect(s.id)}
                  style={{ borderLeftColor: s.color }}
                >
                  <span className="staff-avatar" style={{ backgroundColor: s.color }}>
                    {s.name.charAt(0)}
                  </span>
                  <span style={{ color: s.color }}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Manager Modal */}
      {showStaffManager && (
        <StaffManagerModal
          staff={staff}
          onAdd={onAddStaff}
          onUpdate={onUpdateStaff}
          onDelete={onDeleteStaff}
          onClose={() => setShowStaffManager(false)}
        />
      )}

      {/* Task Manager Modal */}
      {showTaskManager && (
        <TaskManagerModal
          tasks={tasks}
          onAdd={onAddTask}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          onClose={() => setShowTaskManager(false)}
        />
      )}
    </div>
  );
}

// Staff Manager Modal Component
function StaffManagerModal({ staff, onAdd, onUpdate, onDelete, onClose }) {
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffColor, setStaffColor] = useState('#FF6B58');
  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const SATURATED_COLORS = [
    '#FF6B58', '#E74B9C', '#9370DB', '#4A90E2', '#00BCD4', '#20B2AA',
    '#5FB878', '#7FBF3F', '#FFD700', '#FFA500', '#FF8C42', '#DC143C',
    '#BA55D3', '#4682B4', '#32CD32'
  ];

  // Fetch unlinked users when form is shown
  useEffect(() => {
    if (showForm) {
      fetchUnlinkedUsers();
    }
  }, [showForm]);

  const fetchUnlinkedUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/unlinked`);
      setUnlinkedUsers(response.data);
    } catch (error) {
      console.error('Error loading unlinked users:', error);
      setUnlinkedUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (staffName.trim()) {
      const staffData = {
        name: staffName.trim(),
        color: staffColor,
        user_id: selectedUserId
      };

      if (editingStaff) {
        onUpdate(editingStaff.id, staffData);
      } else {
        onAdd(staffData);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setStaffName('');
    setStaffColor('#FF6B58');
    setEditingStaff(null);
    setSelectedUserId(null);
    setShowForm(false);
  };

  const handleEdit = (s) => {
    setEditingStaff(s);
    setStaffName(s.name);
    setStaffColor(s.color);
    setSelectedUserId(s.user_id || null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this staff member?')) {
      onDelete(id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Staff</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!showForm && (
            <button className="add-new-btn" onClick={() => setShowForm(true)}>
              + Add Staff Member
            </button>
          )}

          {showForm && (
            <form className="mobile-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Staff name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
              />
              <div className="user-picker-mobile">
                <label>Link to User (Optional):</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={loadingUsers}
                  className="user-select-mobile"
                >
                  <option value="">-- No User Link --</option>
                  {unlinkedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {loadingUsers && <span className="loading-hint-mobile">Loading...</span>}
              </div>
              <div className="color-picker-mobile">
                <label>Color:</label>
                <div className="color-grid">
                  {SATURATED_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option-mobile ${staffColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setStaffColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-actions-mobile">
                <button type="submit" className="submit-btn-mobile">
                  {editingStaff ? 'Update' : 'Add'}
                </button>
                <button type="button" className="cancel-btn-mobile" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="staff-list-mobile">
            {staff.map((s) => (
              <div key={s.id} className="staff-item-mobile" style={{ borderLeftColor: s.color }}>
                <span style={{ color: s.color }}>{s.name}</span>
                <div className="item-actions">
                  <button onClick={() => handleEdit(s)}>✏️</button>
                  <button onClick={() => handleDelete(s.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Manager Modal Component
function TaskManagerModal({ tasks, onAdd, onUpdate, onDelete, onClose }) {
  const [editingTask, setEditingTask] = useState(null);
  const [taskName, setTaskName] = useState('');
  const [taskIcon, setTaskIcon] = useState('');
  const [taskCategory, setTaskCategory] = useState('');
  const [showForm, setShowForm] = useState(false);

  const SATURATED_COLORS = [
    '#FF6B58', '#E74B9C', '#9370DB', '#4A90E2', '#00BCD4', '#20B2AA',
    '#5FB878', '#7FBF3F', '#FFD700', '#FFA500', '#FF8C42', '#DC143C',
    '#BA55D3', '#4682B4', '#32CD32'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskName.trim() && taskIcon.trim()) {
      if (editingTask) {
        onUpdate(editingTask.id, {
          name: taskName.trim(),
          icon: taskIcon.trim(),
          category: taskCategory.trim() || 'General',
          color: editingTask.color
        });
      } else {
        onAdd({
          name: taskName.trim(),
          icon: taskIcon.trim(),
          category: taskCategory.trim() || 'General',
          color: SATURATED_COLORS[Math.floor(Math.random() * SATURATED_COLORS.length)]
        });
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setTaskName('');
    setTaskIcon('');
    setTaskCategory('');
    setEditingTask(null);
    setShowForm(false);
  };

  const handleEdit = (t) => {
    setEditingTask(t);
    setTaskName(t.name);
    setTaskIcon(t.icon);
    setTaskCategory(t.category || '');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this task?')) {
      onDelete(id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Tasks</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!showForm && (
            <button className="add-new-btn" onClick={() => setShowForm(true)}>
              + Add Task
            </button>
          )}

          {showForm && (
            <form className="mobile-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Emoji (e.g., 🍎)"
                value={taskIcon}
                onChange={(e) => setTaskIcon(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
              />
              <div className="form-actions-mobile">
                <button type="submit" className="submit-btn-mobile">
                  {editingTask ? 'Update' : 'Add'}
                </button>
                <button type="button" className="cancel-btn-mobile" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="task-list-mobile">
            {tasks.map((t) => (
              <div key={t.id} className="task-item-mobile" style={{ borderLeftColor: t.color }}>
                <span>{t.icon} {t.name}</span>
                <div className="item-actions">
                  <button onClick={() => handleEdit(t)}>✏️</button>
                  <button onClick={() => handleDelete(t.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileScheduleView;
