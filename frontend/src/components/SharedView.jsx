import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './SharedView.css';

const API_URL = 'http://localhost:3001/api';
const DAYS_5 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAYS_6 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_COLORS = ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DC143C'];

function SharedView() {
  const { scheduleId } = useParams();
  const [schedule, setSchedule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDays, setShowDays] = useState(5);

  useEffect(() => {
    loadSchedule();
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      const [scheduleRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/schedules/${scheduleId}`),
        axios.get(`${API_URL}/tasks`)
      ]);

      setSchedule(scheduleRes.data);
      setTasks(tasksRes.data);

      // Load assignments from schedule
      const assignmentsMap = {};
      if (scheduleRes.data.assignments && scheduleRes.data.assignments.length > 0) {
        scheduleRes.data.assignments.forEach(assignment => {
          const key = `${assignment.day_of_week}-${assignment.time_slot}`;
          assignmentsMap[key] = {
            ...assignment,
            task: {
              id: assignment.task_id,
              name: assignment.task_name,
              icon: assignment.task_icon,
              color: assignment.task_color
            },
            staff: {
              id: assignment.staff_id,
              name: assignment.staff_name,
              color: assignment.staff_color
            }
          };
        });
      }
      setAssignments(assignmentsMap);
      setLoading(false);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setError('Failed to load schedule. The link may be invalid or expired.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shared-view">
        <div className="loading-message">Loading schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-view">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h2>{error}</h2>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="shared-view">
        <div className="error-message">
          <div className="error-icon">❌</div>
          <h2>Schedule not found</h2>
        </div>
      </div>
    );
  }

  const DAYS = showDays === 6 ? DAYS_6 : DAYS_5;
  const weekStart = new Date(schedule.week_start);
  const weekEnd = new Date(schedule.week_end);
  const weekDateRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

  return (
    <div className="shared-view">
      <div className="shared-header">
        <div className="flower-decoration left">
          <div className="flower">🌻</div>
        </div>
        <div className="title-container">
          <h1 className="shared-title">Weekly Task Schedule</h1>
          <p className="week-dates">{weekDateRange}</p>
          <p className="read-only-badge">📖 Read-Only View</p>
        </div>
        <div className="flower-decoration right">
          <div className="flower">🌻</div>
        </div>
      </div>

      <div className="days-toggle">
        <button
          className={`toggle-btn ${showDays === 5 ? 'active' : ''}`}
          onClick={() => setShowDays(5)}
        >
          5 Days
        </button>
        <button
          className={`toggle-btn ${showDays === 6 ? 'active' : ''}`}
          onClick={() => setShowDays(6)}
        >
          6 Days
        </button>
      </div>

      <div className="shared-table-container">
        <table className="shared-table">
          <thead>
            <tr>
              <th className="task-column">Task/Day</th>
              {DAYS.map((day, index) => (
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
                  <span className="task-name">{task.name}</span>
                </td>
                {DAYS.map((day, dayIndex) => {
                  const key = `${dayIndex}-${task.name}`;
                  const assignment = assignments[key];
                  return (
                    <td
                      key={`${task.id}-${dayIndex}`}
                      className="assignment-cell"
                    >
                      {assignment && (
                        <span
                          className="staff-name-shared"
                          style={{ color: assignment.staff?.color || '#000' }}
                        >
                          {assignment.staff?.name}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shared-footer">
        <div className="footer-decorations">
          <span className="decoration">🦋</span>
          <span className="decoration">🌸</span>
          <span className="decoration">🌼</span>
          <span className="decoration">🌺</span>
          <span className="decoration">🌻</span>
          <span className="decoration">🌷</span>
          <span className="decoration">🌹</span>
          <span className="decoration">🌳</span>
        </div>
        <p className="powered-by">
          Created with Mahuti Weekly Task Schedule
        </p>
      </div>
    </div>
  );
}

export default SharedView;
