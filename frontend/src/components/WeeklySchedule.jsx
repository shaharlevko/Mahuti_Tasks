import { useDrop, useDrag } from 'react-dnd';
import './WeeklySchedule.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COLORS = ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DAA520', '#4682B4'];

function ScheduleCell({ day, task, staff, assignments, onTaskDrop, onRemoveAssignment, onMoveAssignment }) {
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
      className={`schedule-cell ${isOver && canDrop ? 'drag-over' : ''} ${assignment ? 'has-assignment' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ borderColor: task.color }}
    >
      {assignment && (
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
      )}
    </td>
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
  onMoveAssignment
}) {
  const visibleDays = DAYS.slice(0, showDays);

  // Format the week range for display
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (showDays - 1));
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

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
            <th className="task-header">Task/Day</th>
            {visibleDays.map((day, index) => (
              <th key={day} style={{ color: DAY_COLORS[index] }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id}>
              <td className="task-name-cell">
                <span className="task-icon">{task.icon}</span>
                <span>{task.name}</span>
              </td>
              {visibleDays.map((day, dayIndex) => (
                <ScheduleCell
                  key={`${task.id}-${dayIndex}`}
                  day={dayIndex}
                  task={task}
                  staff={staff}
                  assignments={assignments}
                  onTaskDrop={onTaskDrop}
                  onRemoveAssignment={onRemoveAssignment}
                  onMoveAssignment={onMoveAssignment}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WeeklySchedule;
