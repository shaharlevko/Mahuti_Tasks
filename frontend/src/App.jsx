import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import WeeklySchedule from './components/WeeklySchedule';
import TaskLibrary from './components/TaskLibrary';
import PrintView from './components/PrintView';
import ConfirmDialog from './components/ConfirmDialog';
import MobileScheduleView from './components/MobileScheduleView';
import './App.css';

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
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newAssignments)));
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

  const loadInitialData = async () => {
    try {
      const [staffResult, tasksResult] = await Promise.all([
        supabase.from('staff').select('*, users:user_id(id, email, name, role)').order('name'),
        supabase.from('tasks').select('*').order('task_order')
      ]);

      if (staffResult.error) throw staffResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setStaff(staffResult.data);
      setTasks(tasksResult.data);

      await loadScheduleForWeek(weekStartDate);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadScheduleForWeek = async (weekStart) => {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Find or create schedule for this week
      let { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('week_start', weekStart)
        .maybeSingle();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        throw scheduleError;
      }

      if (!schedule) {
        // Create new schedule for this week
        const { data: newSchedule, error: createError } = await supabase
          .from('schedules')
          .insert([{ week_start: weekStart, week_end: weekEndStr }])
          .select()
          .single();

        if (createError) throw createError;
        schedule = newSchedule;
      }

      setCurrentSchedule(schedule);

      // Load assignments for this schedule with staff and task details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          staff:staff_id(*),
          tasks:task_id(*)
        `)
        .eq('schedule_id', schedule.id);

      if (assignmentsError) throw assignmentsError;

      const assignmentsMap = {};
      if (assignmentsData && assignmentsData.length > 0) {
        assignmentsData.forEach(assignment => {
          const dayName = getDayName(assignment.day_of_week);
          const key = `${dayName}-${assignment.time_slot}`;
          assignmentsMap[key] = {
            ...assignment,
            day_of_week: dayName,
            task: assignment.tasks,
            staff: assignment.staff
          };
        });
      }

      setAssignments(assignmentsMap);
      setHistory([JSON.parse(JSON.stringify(assignmentsMap))]);
      setCurrentHistoryIndex(0);
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

    if (!task || !staffMember) {
      alert('Task or staff member not found.');
      return;
    }

    const key = `${day}-${task.name}`;

    // Optimistic update
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

    try {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .insert([{
          schedule_id: currentSchedule.id,
          task_id: taskId,
          staff_id: staffId,
          day_of_week: getDayNumber(day),
          time_slot: task.name
        }])
        .select('*, staff:staff_id(*), tasks:task_id(*)')
        .single();

      if (error) throw error;

      setAssignments(prev => {
        if (deletedKeys.has(key)) {
          setDeletedKeys(prevDeleted => {
            const newDeleted = new Set(prevDeleted);
            newDeleted.delete(key);
            return newDeleted;
          });
          return prev;
        }
        return {
          ...prev,
          [key]: { ...data, day_of_week: day, task: data.tasks, staff: data.staff }
        };
      });
    } catch (error) {
      // Rollback
      const rolledBack = { ...assignments };
      delete rolledBack[key];
      setAssignments(rolledBack);
      console.error('Error creating assignment:', error);
      alert(`Failed to assign staff: ${error.message}`);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    let assignmentKey = null;
    Object.keys(assignments).forEach(key => {
      if (assignments[key].id === assignmentId) {
        assignmentKey = key;
      }
    });

    const previousAssignments = { ...assignments };
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key].id === assignmentId) {
        delete newAssignments[key];
      }
    });
    saveToHistory(newAssignments);
    setAssignments(newAssignments);

    if (String(assignmentId).startsWith('temp-')) {
      if (assignmentKey) {
        setDeletedKeys(prev => new Set(prev).add(assignmentKey));
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      setAssignments(previousAssignments);
      console.error('Error removing assignment:', error);
      alert('Failed to remove assignment.');
    }
  };

  const handleMoveAssignment = async (fromKey, toDay, toTaskName) => {
    if (!currentSchedule) return;

    try {
      const fromAssignment = assignments[fromKey];
      if (!fromAssignment) return;

      const toKey = `${toDay}-${toTaskName}`;
      const toAssignment = assignments[toKey];

      if (toAssignment) {
        // Swap assignments
        await Promise.all([
          supabase.from('schedule_assignments').update({
            task_id: toAssignment.task_id,
            day_of_week: getDayNumber(toDay),
            time_slot: toTaskName
          }).eq('id', fromAssignment.id),
          supabase.from('schedule_assignments').update({
            task_id: fromAssignment.task_id,
            day_of_week: getDayNumber(fromAssignment.day_of_week),
            time_slot: fromAssignment.time_slot
          }).eq('id', toAssignment.id)
        ]);

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
        // Move to empty cell
        const task = tasks.find(t => t.name === toTaskName);
        await supabase.from('schedule_assignments').update({
          task_id: task.id,
          day_of_week: getDayNumber(toDay),
          time_slot: toTaskName
        }).eq('id', fromAssignment.id);

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
      const { data, error } = await supabase
        .from('staff')
        .insert([staffData])
        .select()
        .single();

      if (error) throw error;
      setStaff(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff member');
    }
  };

  const handleUpdateStaff = async (staffId, staffData) => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', staffId)
        .select()
        .single();

      if (error) throw error;

      setStaff(prev => prev.map(s => s.id === staffId ? data : s));
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].staff_id === staffId) {
            newAssignments[key].staff = data;
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
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      setStaff(prev => prev.filter(s => s.id !== staffId));
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
      // Get max task_order
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('task_order')
        .order('task_order', { ascending: false })
        .limit(1);

      const maxOrder = existingTasks && existingTasks.length > 0 ? existingTasks[0].task_order : 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, task_order: maxOrder + 1 }])
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
      setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key].task_id === taskId) {
            newAssignments[key].task = data;
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
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
      setTasks(newTasksOrder);

      // Update all task orders in parallel
      const updates = taskOrders.map(({ id, task_order }) =>
        supabase.from('tasks').update({ task_order }).eq('id', id)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering tasks:', error);
      alert('Failed to reorder tasks');
      // Reload from database
      const { data } = await supabase.from('tasks').select('*').order('task_order');
      if (data) setTasks(data);
    }
  };

  const handleClearWeek = () => {
    if (!currentSchedule) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirmDialog(false);

    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('schedule_id', currentSchedule.id);

      if (error) throw error;

      const newAssignments = {};
      saveToHistory(newAssignments);
      setAssignments(newAssignments);
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week.');
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

  const dndBackend = isMobile ? TouchBackend : HTML5Backend;

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
      />
    );
  }

  return (
    <DndProvider backend={dndBackend}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-left">
              <span className="flower-icon">🌻</span>
              <h1>Mahuti Weekly Task Schedule</h1>
              <span className="flower-icon">🌻</span>
            </div>
            <div className="header-actions">
              <span className="user-info">
                👤 {user.name} ({user.role})
              </span>
              {isAdmin() && (
                <button className="btn-manage-users" onClick={() => navigate('/admin/users')}>
                  👥 Manage Users
                </button>
              )}
              <button className="btn-logout" onClick={logout}>
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
    return <div className="loading">Loading Mahuti Tasks...</div>;
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
