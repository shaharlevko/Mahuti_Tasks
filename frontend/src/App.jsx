import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';
import WeeklySchedule from './components/WeeklySchedule';
import TaskLibrary from './components/TaskLibrary';
import PrintView from './components/PrintView';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [showPrintView, setShowPrintView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDays, setShowDays] = useState(5);

  // Calculate the current week's Sunday
  const getCurrentSunday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    return sunday.toISOString().split('T')[0];
  };

  const [weekStartDate, setWeekStartDate] = useState(getCurrentSunday());

  const navigateWeek = (direction) => {
    const currentDate = new Date(weekStartDate);
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    setWeekStartDate(currentDate.toISOString().split('T')[0]);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [staffRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/staff`),
        axios.get(`${API_URL}/tasks`)
      ]);
      setStaff(staffRes.data);
      setTasks(tasksRes.data);

      // Create a new schedule for current week
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday

      const scheduleRes = await axios.post(`${API_URL}/schedules`, {
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        name: `Week of ${weekStart.toLocaleDateString()}`
      });
      setCurrentSchedule(scheduleRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleTaskDrop = async (taskId, day, staffId) => {
    if (!currentSchedule) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      const staffMember = staff.find(s => s.id === staffId);

      const response = await axios.post(`${API_URL}/assignments`, {
        schedule_id: currentSchedule.id,
        task_id: taskId,
        staff_id: staffId,
        day_of_week: day,
        time_slot: task.name
      });

      // Update local state
      const key = `${day}-${task.name}`;
      setAssignments(prev => ({
        ...prev,
        [key]: { ...response.data, task, staff: staffMember }
      }));
    } catch (error) {
      if (error.response?.status === 409) {
        alert('Conflict: Staff member already assigned at this time!');
      } else {
        console.error('Error creating assignment:', error);
      }
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await axios.delete(`${API_URL}/assignments/${assignmentId}`);
      // Remove from local state
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].id === assignmentId) {
            delete newAssignments[key];
          }
        });
        return newAssignments;
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const handleMoveAssignment = async (fromKey, toDay, toTaskName) => {
    if (!currentSchedule) return;

    try {
      const fromAssignment = assignments[fromKey];
      if (!fromAssignment) return;

      const toKey = `${toDay}-${toTaskName}`;
      const toAssignment = assignments[toKey];

      // If destination is occupied, swap the assignments
      if (toAssignment) {
        // Update both assignments
        await Promise.all([
          axios.put(`${API_URL}/assignments/${fromAssignment.id}`, {
            task_id: toAssignment.task_id,
            staff_id: fromAssignment.staff_id,
            day_of_week: toDay,
            time_slot: toTaskName,
            notes: fromAssignment.notes
          }),
          axios.put(`${API_URL}/assignments/${toAssignment.id}`, {
            task_id: fromAssignment.task_id,
            staff_id: toAssignment.staff_id,
            day_of_week: fromAssignment.day_of_week,
            time_slot: fromAssignment.time_slot,
            notes: toAssignment.notes
          })
        ]);

        // Swap in local state
        setAssignments(prev => ({
          ...prev,
          [fromKey]: {
            ...toAssignment,
            day_of_week: fromAssignment.day_of_week,
            time_slot: fromAssignment.time_slot,
            task: fromAssignment.task
          },
          [toKey]: {
            ...fromAssignment,
            day_of_week: toDay,
            time_slot: toTaskName,
            task: toAssignment.task
          }
        }));
      } else {
        // Just move to empty cell
        const task = tasks.find(t => t.name === toTaskName);
        await axios.put(`${API_URL}/assignments/${fromAssignment.id}`, {
          task_id: task.id,
          staff_id: fromAssignment.staff_id,
          day_of_week: toDay,
          time_slot: toTaskName,
          notes: fromAssignment.notes
        });

        // Update local state
        setAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[fromKey];
          newAssignments[toKey] = {
            ...fromAssignment,
            task_id: task.id,
            task: task,
            day_of_week: toDay,
            time_slot: toTaskName
          };
          return newAssignments;
        });
      }
    } catch (error) {
      console.error('Error moving assignment:', error);
      alert('Failed to move assignment');
    }
  };

  const handleAddStaff = async (staffData) => {
    try {
      const response = await axios.post(`${API_URL}/staff`, staffData);
      setStaff(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff member');
    }
  };

  const handleUpdateStaff = async (staffId, staffData) => {
    try {
      const response = await axios.put(`${API_URL}/staff/${staffId}`, staffData);
      setStaff(prev => prev.map(s => s.id === staffId ? response.data : s));
      // Update assignments with new staff data
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].staff_id === staffId) {
            newAssignments[key].staff = response.data;
          }
        });
        return newAssignments;
      });
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await axios.delete(`${API_URL}/staff/${staffId}`);
      setStaff(prev => prev.filter(s => s.id !== staffId));
      // Remove assignments for this staff member
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].staff_id === staffId) {
            delete newAssignments[key];
          }
        });
        return newAssignments;
      });
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      const response = await axios.post(`${API_URL}/tasks`, taskData);
      setTasks(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
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
  };

  if (loading) {
    return <div className="loading">Loading Mahuti Tasks...</div>;
  }

  if (showPrintView) {
    return (
      <PrintView
        tasks={tasks}
        staff={staff}
        assignments={assignments}
        weekStartDate={weekStartDate}
        showDays={showDays}
        onClose={() => setShowPrintView(false)}
      />
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-left">
              <span className="flower-icon">🌻</span>
              <h1>Mahuti Weekly Task Schedule</h1>
              <span className="flower-icon">🌻</span>
            </div>
            <div className="header-actions">
              <button className="btn-print" onClick={() => setShowPrintView(true)}>
                🖨️ Print Schedule
              </button>
            </div>
          </div>
        </header>

        <div className="app-content">
          <TaskLibrary
            tasks={tasks}
            staff={staff}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
          <WeeklySchedule
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
          />
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
