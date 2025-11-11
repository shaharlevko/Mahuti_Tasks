import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';
import { getInitials, getRoleBorderColor } from './utils/userUtils';
import Login from './components/Login';
import Register from './components/Register';
import WeeklySchedule from './components/WeeklySchedule';
import TaskLibrary from './components/TaskLibrary';
import PrintView from './components/PrintView';
import ConfirmDialog from './components/ConfirmDialog';
import MobileScheduleView from './components/MobileScheduleView';
import LoadingAnimation from './components/LoadingAnimation';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper functions to convert between day names and integers (for Supabase)
const DAYS_MAP = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

const DAYS_ARRAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDayNumber = (dayName) => DAYS_MAP[dayName];
const getDayName = (dayNumber) => DAYS_ARRAY[dayNumber];

function MainApp() {
  const { user, logout, canEdit, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [showPrintView, setShowPrintView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [showDays, setShowDays] = useState(5);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // Track deleted assignment keys to prevent race conditions
  const [deletedKeys, setDeletedKeys] = useState(new Set());

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
    setLoadingWeek(true);
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload schedule when week changes
  useEffect(() => {
    if (staff.length > 0 && tasks.length > 0) {
      loadScheduleForWeek(weekStartDate);
    }
  }, [weekStartDate]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (!currentSchedule) return;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest assignments from server
        const scheduleRes = await axios.get(`${API_URL}/schedules/by-week/${weekStartDate}`);
        const schedule = scheduleRes.data;

        // Transform assignments to map
        const remoteAssignmentsMap = {};
        if (schedule.assignments && schedule.assignments.length > 0) {
          schedule.assignments.forEach(assignment => {
            const dayName = getDayName(assignment.day_of_week);
            const key = `${dayName}-${assignment.time_slot}`;
            remoteAssignmentsMap[key] = {
              ...assignment,
              day_of_week: dayName,
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

        // Check if there are actual differences
        const currentKeys = Object.keys(assignments);
        const remoteKeys = Object.keys(remoteAssignmentsMap);

        const hasChanges = currentKeys.length !== remoteKeys.length ||
                           currentKeys.some(key => !remoteAssignmentsMap[key]) ||
                           remoteKeys.some(key => !assignments[key]);

        // Only update if there are changes
        if (hasChanges) {
          setAssignments(remoteAssignmentsMap);
          // Update history with synced state
          setHistory(prev => [...prev, JSON.parse(JSON.stringify(remoteAssignmentsMap))]);
          setCurrentHistoryIndex(prev => prev + 1);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [currentSchedule, weekStartDate, assignments]);

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
          const dayName = getDayName(assignment.day_of_week);
          const key = `${dayName}-${assignment.time_slot}`;
          assignmentsMap[key] = {
            ...assignment,
            day_of_week: dayName, // Convert to day name for frontend consistency
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
      // Clear deleted keys when loading new schedule
      setDeletedKeys(new Set());
      setLoadingWeek(false);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setLoadingWeek(false);
    }
  };

  const handleTaskDrop = async (taskId, day, staffId) => {
    if (!currentSchedule) {
      alert('Schedule not loaded. Please refresh the page.');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    const staffMember = staff.find(s => s.id === staffId);

    // Validation
    if (!task) {
      console.error('Task not found:', taskId);
      alert('Task not found. Please try again.');
      return;
    }
    if (!staffMember) {
      console.error('Staff member not found:', staffId);
      alert('Staff member not found. Please try again.');
      return;
    }
    if (!currentSchedule.id) {
      console.error('Schedule ID is missing:', currentSchedule);
      alert('Schedule ID is missing. Please refresh the page.');
      return;
    }

    const key = `${day}-${task.name}`;

    // Optimistic update - update UI immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticAssignment = {
      id: tempId,
      schedule_id: currentSchedule.id,
      task_id: taskId,
      staff_id: staffId,
      day_of_week: day,
      time_slot: task.name,
      task,
      staff: staffMember
    };

    const newAssignments = {
      ...assignments,
      [key]: optimisticAssignment
    };
    saveToHistory(newAssignments);
    setAssignments(newAssignments);

    // Debug log
    console.log('Creating assignment with:', {
      schedule_id: currentSchedule.id,
      task_id: taskId,
      staff_id: staffId,
      day_of_week: getDayNumber(day),
      day_name: day,
      time_slot: task.name
    });

    // Sync with server in background
    try {
      const response = await axios.post(`${API_URL}/assignments`, {
        schedule_id: currentSchedule.id,
        task_id: taskId,
        staff_id: staffId,
        day_of_week: getDayNumber(day),
        time_slot: task.name
      });

      // Update with real ID from server (only if not deleted in the meantime)
      setAssignments(prev => {
        // Check if this assignment was deleted while the request was in flight
        if (deletedKeys.has(key)) {
          // Remove from deletedKeys set and don't add the assignment
          setDeletedKeys(prevDeleted => {
            const newDeleted = new Set(prevDeleted);
            newDeleted.delete(key);
            return newDeleted;
          });
          return prev;
        }
        return {
          ...prev,
          [key]: { ...response.data, day_of_week: day, task, staff: staffMember }
        };
      });
    } catch (error) {
      // Rollback on error
      const rolledBack = { ...assignments };
      delete rolledBack[key];
      setAssignments(rolledBack);

      if (error.response?.status === 409) {
        alert('Conflict: Staff member already assigned at this time!');
      } else if (error.response?.status === 401) {
        alert('Authentication error. Please log in again.');
        console.error('Auth error:', error.response?.data);
      } else if (error.response?.status === 403) {
        alert('Access denied. You need admin or manager role to make changes.');
        console.error('Permission error:', error.response?.data);
      } else {
        console.error('Error creating assignment:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        alert(`Failed to assign staff: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    // Find the key for this assignment
    let assignmentKey = null;
    Object.keys(assignments).forEach(key => {
      if (assignments[key].id === assignmentId) {
        assignmentKey = key;
      }
    });

    // Optimistic update - remove immediately
    const previousAssignments = { ...assignments };
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key].id === assignmentId) {
        delete newAssignments[key];
      }
    });
    saveToHistory(newAssignments);
    setAssignments(newAssignments);

    // Skip backend sync if this is a temporary ID (optimistic update not yet confirmed)
    if (String(assignmentId).startsWith('temp-')) {
      // Mark this key as deleted to prevent the POST response from re-adding it
      if (assignmentKey) {
        setDeletedKeys(prev => new Set(prev).add(assignmentKey));
      }
      return;
    }

    // Sync with server in background
    try {
      await axios.delete(`${API_URL}/assignments/${assignmentId}`);
    } catch (error) {
      // Rollback on error
      setAssignments(previousAssignments);
      console.error('Error removing assignment:', error);
      alert('Failed to remove assignment. Please try again.');
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
            day_of_week: getDayNumber(toDay),
            time_slot: toTaskName,
            notes: fromAssignment.notes
          }),
          axios.put(`${API_URL}/assignments/${toAssignment.id}`, {
            task_id: fromAssignment.task_id,
            staff_id: toAssignment.staff_id,
            day_of_week: getDayNumber(fromAssignment.day_of_week),
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
          day_of_week: getDayNumber(toDay),
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
    return <LoadingAnimation size="default" message="Loading Mahuti Tasks..." />;
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

  // Determine which backend to use based on device
  const dndBackend = isMobile ? TouchBackend : HTML5Backend;

  // Render mobile view
  if (isMobile) {
    return (
      <MobileScheduleView
        tasks={tasks}
        staff={staff}
        assignments={assignments}
        weekStartDate={weekStartDate}
        showDays={showDays}
        onNavigateWeek={navigateWeek}
        onTaskDrop={handleTaskDrop}
        onRemoveAssignment={handleRemoveAssignment}
        onClearWeek={handleClearWeek}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onShowPrintView={() => setShowPrintView(true)}
        onAddStaff={handleAddStaff}
        onUpdateStaff={handleUpdateStaff}
        onDeleteStaff={handleDeleteStaff}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        user={user}
      />
    );
  }

  // Render desktop view
  return (
    <DndProvider backend={dndBackend}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-left">
              <img src="/mahuti-logo.svg" alt="Mahuti" className="header-logo" />
            </div>
            <div className="header-actions">
              <div className="user-avatar" style={{ borderColor: getRoleBorderColor(user.role) }}>
                {user.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt={user.name}
                    className="user-avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span className="user-avatar-initials" style={{ display: user.profile_picture_url ? 'none' : 'flex' }}>
                  {getInitials(user.name)}
                </span>
              </div>
              {isAdmin() && (
                <button className="btn-manage-users" onClick={() => navigate('/admin/users')}>
                  👥 Users
                </button>
              )}
              <button className="btn-logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </header>

        <div className="app-content">
          <TaskLibrary
            staff={staff}
            onAddStaff={canEdit() ? handleAddStaff : null}
            onUpdateStaff={canEdit() ? handleUpdateStaff : null}
            onDeleteStaff={canEdit() ? handleDeleteStaff : null}
            canEdit={canEdit()}
          />
          <WeeklySchedule
            tasks={tasks}
            staff={staff}
            assignments={assignments}
            weekStartDate={weekStartDate}
            showDays={showDays}
            loadingWeek={loadingWeek}
            onNavigateWeek={navigateWeek}
            onShowDaysChange={setShowDays}
            onTaskDrop={canEdit() ? handleTaskDrop : null}
            onRemoveAssignment={canEdit() ? handleRemoveAssignment : null}
            onMoveAssignment={canEdit() ? handleMoveAssignment : null}
            onClearWeek={canEdit() ? handleClearWeek : null}
            onUndo={canEdit() ? handleUndo : null}
            onRedo={canEdit() ? handleRedo : null}
            canUndo={canEdit() && canUndo}
            canRedo={canEdit() && canRedo}
            onAddTask={canEdit() ? handleAddTask : null}
            onUpdateTask={canEdit() ? handleUpdateTask : null}
            onDeleteTask={canEdit() ? handleDeleteTask : null}
            onReorderTasks={canEdit() ? handleReorderTasks : null}
            canEdit={canEdit()}
            onShowPrintView={() => setShowPrintView(true)}
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

function App() {
  return <AppContent />;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return <LoadingAnimation size="default" message="Loading Mahuti Tasks..." />;
  }

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return <MainApp />;
}

export default App;

