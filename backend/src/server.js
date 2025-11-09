const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const supabase = require('./db');
const { requireAuth, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const invitationsRoutes = require('./routes/invitations');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Invitations routes (admin only, except validation endpoint)
app.use('/api/invitations', invitationsRoutes);

// Staff endpoints (protected)
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    // Join with users table to include user info when user_id exists
    const { data: staff, error } = await supabase
      .from('staff')
      .select(`
        *,
        users:user_id (
          id,
          email,
          name,
          role
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching staff:', error);
      return res.status(500).json({ error: 'Failed to fetch staff' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/staff', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, role, color, user_id } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    // Validate user_id if provided
    if (user_id !== undefined && user_id !== null) {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        return res.status(400).json({ error: 'Invalid user_id: User not found' });
      }

      // Check if user is already linked to another staff member
      const { data: existingStaff, error: linkError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (linkError && linkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        console.error('Error checking existing staff link:', linkError);
        return res.status(500).json({ error: 'Failed to validate user link' });
      }

      if (existingStaff) {
        return res.status(409).json({ error: 'This user is already linked to another staff member' });
      }
    }

    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert({ name, role, color, user_id })
      .select()
      .single();

    if (error) {
      console.error('Error creating staff:', error);
      return res.status(500).json({ error: 'Failed to create staff member' });
    }

    res.json(newStaff);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/staff/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, role, color, user_id } = req.body;
    const { id } = req.params;

    // Validate user_id if provided
    if (user_id !== undefined && user_id !== null) {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        return res.status(400).json({ error: 'Invalid user_id: User not found' });
      }

      // Check if user is already linked to a DIFFERENT staff member
      const { data: existingStaff, error: linkError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user_id)
        .neq('id', id) // Exclude current staff member
        .maybeSingle();

      if (linkError && linkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        console.error('Error checking existing staff link:', linkError);
        return res.status(500).json({ error: 'Failed to validate user link' });
      }

      if (existingStaff) {
        return res.status(409).json({ error: 'This user is already linked to another staff member' });
      }
    }

    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update({ name, role, color, user_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff:', error);
      return res.status(500).json({ error: 'Failed to update staff member' });
    }

    if (!updatedStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(updatedStaff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/staff/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting staff:', error);
      return res.status(500).json({ error: 'Failed to delete staff member' });
    }

    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unlinked users for staff assignment dropdown
app.get('/api/users/unlinked', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    // Get all user IDs that are already linked to staff
    const { data: linkedStaff, error: staffError } = await supabase
      .from('staff')
      .select('user_id')
      .not('user_id', 'is', null);

    if (staffError) {
      console.error('Error fetching linked staff:', staffError);
      return res.status(500).json({ error: 'Failed to fetch linked users' });
    }

    const linkedUserIds = linkedStaff.map(s => s.user_id);

    // Get all users that are NOT in the linked list
    let query = supabase
      .from('users')
      .select('id, email, name, role')
      .order('name');

    if (linkedUserIds.length > 0) {
      query = query.not('id', 'in', `(${linkedUserIds.join(',')})`);
    }

    const { data: unlinkedUsers, error } = await query;

    if (error) {
      console.error('Error fetching unlinked users:', error);
      return res.status(500).json({ error: 'Failed to fetch unlinked users' });
    }

    res.json(unlinkedUsers);
  } catch (error) {
    console.error('Get unlinked users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tasks endpoints (protected)
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('order_index')
      .order('id');

    if (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasks', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, icon, category, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get the highest order_index and set new task to be last
    const { data: maxOrderData, error: maxError } = await supabase
      .from('tasks')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('Error getting max order:', maxError);
      return res.status(500).json({ error: 'Failed to determine task order' });
    }

    const newOrderIndex = (maxOrderData?.[0]?.order_index ?? -1) + 1;

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ name, icon, category, color, order_index: newOrderIndex })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    res.json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tasks/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, icon, category, color } = req.body;
    const { id } = req.params;

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({ name, icon, category, color, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder tasks endpoint
app.put('/api/tasks/reorder', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { taskOrders } = req.body; // Array of { id, order_index }

    if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
      return res.status(400).json({ error: 'taskOrders must be a non-empty array' });
    }

    // Update all tasks with their new order_index values
    const updatePromises = taskOrders.map(({ id, order_index }) =>
      supabase
        .from('tasks')
        .update({ order_index })
        .eq('id', id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error reordering tasks:', errors);
      return res.status(500).json({ error: 'Some updates failed', details: errors });
    }

    res.json({ message: 'Task order updated successfully', count: taskOrders.length });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tasks/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Schedules endpoints (protected)
app.get('/api/schedules', requireAuth, async (req, res) => {
  try {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .order('week_start', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      return res.status(500).json({ error: 'Failed to fetch schedules' });
    }

    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or create schedule by week start date
app.get('/api/schedules/by-week/:week_start', requireAuth, async (req, res) => {
  try {
    const weekStart = req.params.week_start;

    // Try to find existing schedule
    const { data: schedule, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('week_start', weekStart)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching schedule:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }

    if (schedule) {
      // Schedule exists, load with assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          tasks!inner(name, icon, color),
          staff!inner(name, color)
        `)
        .eq('schedule_id', schedule.id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return res.status(500).json({ error: 'Failed to fetch assignments' });
      }

      // Transform the nested structure to match old format
      const transformedAssignments = assignments.map(a => ({
        ...a,
        task_name: a.tasks.name,
        task_icon: a.tasks.icon,
        task_color: a.tasks.color,
        staff_name: a.staff.name,
        staff_color: a.staff.color
      }));

      res.json({ ...schedule, assignments: transformedAssignments });
    } else {
      // Create new schedule for this week
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split('T')[0];
      const name = `Week of ${weekStartDate.toLocaleDateString()}`;

      const { data: newSchedule, error: insertError } = await supabase
        .from('schedules')
        .insert({ week_start: weekStart, week_end: weekEnd, name })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating schedule:', insertError);
        return res.status(500).json({ error: 'Failed to create schedule' });
      }

      res.json({ ...newSchedule, assignments: [] });
    }
  } catch (error) {
    console.error('Get/create schedule by week error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/schedules/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError);
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Get assignments for this schedule
    const { data: assignments, error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        tasks!inner(name, icon, color),
        staff!inner(name, color)
      `)
      .eq('schedule_id', id);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    // Transform the nested structure to match old format
    const transformedAssignments = assignments.map(a => ({
      ...a,
      task_name: a.tasks.name,
      task_icon: a.tasks.icon,
      task_color: a.tasks.color,
      staff_name: a.staff.name,
      staff_color: a.staff.color
    }));

    res.json({ ...schedule, assignments: transformedAssignments });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/schedules', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { week_start, week_end, name } = req.body;

    if (!week_start || !week_end || !name) {
      return res.status(400).json({ error: 'week_start, week_end, and name are required' });
    }

    const { data: newSchedule, error } = await supabase
      .from('schedules')
      .insert({ week_start, week_end, name })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      return res.status(500).json({ error: 'Failed to create schedule' });
    }

    res.json(newSchedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/schedules/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: updatedSchedule, error } = await supabase
      .from('schedules')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    if (!updatedSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/schedules/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Schedule assignments endpoints (protected)
app.post('/api/assignments', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { schedule_id, task_id, staff_id, day_of_week, time_slot, notes } = req.body;

    console.log('Received assignment request:', { schedule_id, task_id, staff_id, day_of_week, time_slot, notes });

    // Use explicit null/undefined checks because day_of_week can be 0 (Sunday)
    if (!schedule_id || !task_id || !staff_id || day_of_week === null || day_of_week === undefined || !time_slot) {
      console.log('Validation failed. Missing fields:', {
        schedule_id: !schedule_id,
        task_id: !task_id,
        staff_id: !staff_id,
        day_of_week: day_of_week === null || day_of_week === undefined,
        time_slot: !time_slot
      });
      return res.status(400).json({ error: 'schedule_id, task_id, staff_id, day_of_week, and time_slot are required' });
    }

    // Check for conflicts
    const { data: existing, error: conflictError } = await supabase
      .from('schedule_assignments')
      .select('*')
      .eq('schedule_id', schedule_id)
      .eq('staff_id', staff_id)
      .eq('day_of_week', day_of_week)
      .eq('time_slot', time_slot)
      .single();

    if (conflictError && conflictError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking for conflicts:', conflictError);
      return res.status(500).json({ error: 'Failed to check for conflicts' });
    }

    if (existing) {
      return res.status(409).json({ error: 'Conflict: Staff member already assigned at this time' });
    }

    const { data: newAssignment, error } = await supabase
      .from('schedule_assignments')
      .insert({ schedule_id, task_id, staff_id, day_of_week, time_slot, notes })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }

    res.json(newAssignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/assignments/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { task_id, staff_id, day_of_week, time_slot, notes } = req.body;
    const { id } = req.params;

    const { data: updatedAssignment, error } = await supabase
      .from('schedule_assignments')
      .update({ task_id, staff_id, day_of_week, time_slot, notes })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }

    if (!updatedAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/assignments/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('schedule_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting assignment:', error);
      return res.status(500).json({ error: 'Failed to delete assignment' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all assignments for a schedule
app.delete('/api/schedules/:id/assignments', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const { data: deletedAssignments, error } = await supabase
      .from('schedule_assignments')
      .delete()
      .eq('schedule_id', scheduleId)
      .select();

    if (error) {
      console.error('Error clearing assignments:', error);
      return res.status(500).json({ error: 'Failed to clear assignments' });
    }

    res.json({
      message: 'All assignments cleared successfully',
      deletedCount: deletedAssignments?.length || 0
    });
  } catch (error) {
    console.error('Clear assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Templates endpoints (protected)
app.get('/api/templates', requireAuth, async (req, res) => {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    // Parse template_data JSON
    const parsedTemplates = templates.map(template => ({
      ...template,
      template_data: typeof template.template_data === 'string'
        ? JSON.parse(template.template_data)
        : template.template_data
    }));

    res.json(parsedTemplates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/templates', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, template_data } = req.body;

    if (!name || !template_data) {
      return res.status(400).json({ error: 'Name and template_data are required' });
    }

    const { data: newTemplate, error } = await supabase
      .from('templates')
      .insert({
        name,
        description,
        template_data: typeof template_data === 'string' ? template_data : JSON.stringify(template_data)
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    res.json({
      ...newTemplate,
      template_data: typeof newTemplate.template_data === 'string'
        ? JSON.parse(newTemplate.template_data)
        : newTemplate.template_data
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/templates/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup endpoint to remove duplicates (admin only)
app.post('/api/cleanup', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Remove duplicate staff members, keeping only the first occurrence (lowest ID)
    // First, find all duplicate names
    const { data: duplicateStaff, error: staffError } = await supabase.rpc('remove_duplicate_staff');

    if (staffError) {
      // If the RPC function doesn't exist, we'll do it manually
      console.log('RPC function not found, cleaning up manually');

      // Get all staff grouped by name
      const { data: allStaff, error: fetchStaffError } = await supabase
        .from('staff')
        .select('*')
        .order('name')
        .order('id');

      if (fetchStaffError) {
        console.error('Error fetching staff:', fetchStaffError);
        return res.status(500).json({ error: 'Failed to fetch staff' });
      }

      // Find duplicates and keep only first occurrence
      const staffByName = {};
      const toDelete = [];

      allStaff.forEach(staff => {
        if (!staffByName[staff.name]) {
          staffByName[staff.name] = staff.id;
        } else {
          toDelete.push(staff.id);
        }
      });

      // Delete duplicates
      if (toDelete.length > 0) {
        const { error: deleteStaffError } = await supabase
          .from('staff')
          .delete()
          .in('id', toDelete);

        if (deleteStaffError) {
          console.error('Error deleting duplicate staff:', deleteStaffError);
          return res.status(500).json({ error: 'Failed to delete duplicate staff' });
        }
      }

      // Do the same for tasks
      const { data: allTasks, error: fetchTasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('name')
        .order('id');

      if (fetchTasksError) {
        console.error('Error fetching tasks:', fetchTasksError);
        return res.status(500).json({ error: 'Failed to fetch tasks' });
      }

      const tasksByName = {};
      const tasksToDelete = [];

      allTasks.forEach(task => {
        if (!tasksByName[task.name]) {
          tasksByName[task.name] = task.id;
        } else {
          tasksToDelete.push(task.id);
        }
      });

      if (tasksToDelete.length > 0) {
        const { error: deleteTasksError } = await supabase
          .from('tasks')
          .delete()
          .in('id', tasksToDelete);

        if (deleteTasksError) {
          console.error('Error deleting duplicate tasks:', deleteTasksError);
          return res.status(500).json({ error: 'Failed to delete duplicate tasks' });
        }
      }

      res.json({
        message: 'Database cleanup completed successfully',
        note: 'Duplicate staff and tasks have been removed',
        staffDeleted: toDelete.length,
        tasksDeleted: tasksToDelete.length
      });
    } else {
      res.json({
        message: 'Database cleanup completed successfully',
        note: 'Duplicate staff and tasks have been removed'
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Mahuti Tasks API running on http://localhost:${PORT}`);
});
