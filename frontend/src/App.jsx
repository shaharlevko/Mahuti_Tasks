import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';
import WeeklySchedule from './components/WeeklySchedule';
import TaskLibrary from './components/TaskLibrary';
import PrintView from './components/PrintView';
import ConfirmDialog from './components/ConfirmDialog';
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

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

  // Undo/Redo functions
  const saveToHistory = (newAssignments) => {
    // Remove any history after current index (when making new changes after undo)
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    // Add current state to history
    newHistory.push(JSON.parse(JSON.stringify(newAssignments)));
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
    setHistory(newHistory);
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const previousState = history[currentHistoryIndex - 1];
      setAssignments(JSON.parse(JSON.stringify(previousState)));
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const nextState = history[currentHistoryIndex + 1];
      setAssignments(JSON.parse(JSON.stringify(nextState)));
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
  };

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload schedule when week changes
  useEffect(() => {
    if (staff.length > 0 && tasks.length > 0) {
      loadScheduleForWeek(weekStartDate);
    }
  }, [weekStartDate]);

  const loadInitialData = async () => {
    try {
      const [staffRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/staff`),
        axios.get(`${API_URL}/tasks`)
      ]);
      setStaff(staffRes.data);
      setTasks(tasksRes.data);

      // Load or create schedule for current week
      await loadScheduleForWeek(weekStartDate);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadScheduleForWeek = async (weekStart) => {
    try {
      const scheduleRes = await axios.get(`${API_URL}/schedules/by-week/${weekStart}`);
      const schedule = scheduleRes.data;
      setCurrentSchedule(schedule);

      // Load assignments from schedule
      const assignmentsMap = {};
      if (schedule.assignments && schedule.assignments.length > 0) {
        schedule.assignments.forEach(assignment => {
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
      // Initialize history with loaded state
      setHistory([JSON.parse(JSON.stringify(assignmentsMap))]);
      setCurrentHistoryIndex(0);
    } catch (error) {
      console.error('Error loading schedule:', error);
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
      const newAssignments = {
        ...assignments,
        [key]: { ...response.data, task, staff: staffMember }
      };
      saveToHistory(newAssignments);
      setAssignments(newAssignments);
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
      const newAssignments = { ...assignments };
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key].id === assignmentId) {
          delete newAssignments[key];
        }
      });
      saveToHistory(newAssignments);
      setAssignments(newAssignments);
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
        const newAssignments = {
          ...assignments,
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
        };
        saveToHistory(newAssignments);
        setAssignments(newAssignments);
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
        const newAssignments = { ...assignments };
        delete newAssignments[fromKey];
        newAssignments[toKey] = {
          ...fromAssignment,
          task_id: task.id,
          task: task,
          day_of_week: toDay,
          time_slot: toTaskName
        };
        saveToHistory(newAssignments);
        setAssignments(newAssignments);
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

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const response = await axios.put(`${API_URL}/tasks/${taskId}`, taskData);
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      // Update assignments with new task data
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].task_id === taskId) {
            newAssignments[key].task = response.data;
          }
        });
        return newAssignments;
      });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
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

  const handleReorderTasks = async (taskOrders, newTasksOrder) => {
    try {
      // Optimistically update UI
      setTasks(newTasksOrder);

      // Persist to backend
      await axios.put(`${API_URL}/tasks/reorder`, { taskOrders });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      alert('Failed to reorder tasks');
      // Reload tasks from server on error
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    }
  };

  const handleClearWeek = () => {
    if (!currentSchedule) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirmDialog(false);

    try {
      await axios.delete(`${API_URL}/schedules/${currentSchedule.id}/assignments`);
      const newAssignments = {};
      saveToHistory(newAssignments);
      setAssignments(newAssignments);
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week. Please try again.');
    }
  };

  const handleCancelClear = () => {
    setShowConfirmDialog(false);
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
        scheduleId={currentSchedule?.id}
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
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={handleReorderTasks}
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
            onClearWeek={handleClearWeek}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        message="Are you sure you want to clear this week?"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />
    </DndProvider>
  );
}

export default App;

