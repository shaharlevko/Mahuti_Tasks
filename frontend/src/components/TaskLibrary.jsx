import { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import axios from 'axios';
import './TaskLibrary.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const SATURATED_COLORS = [
  '#FF6B58', // Coral red
  '#E74B9C', // Hot pink
  '#9370DB', // Purple
  '#4A90E2', // Blue
  '#00BCD4', // Cyan
  '#20B2AA', // Teal
  '#5FB878', // Green
  '#7FBF3F', // Lime green
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#FF8C42', // Burnt orange
  '#DC143C', // Crimson
  '#BA55D3', // Medium orchid
  '#4682B4', // Steel blue
  '#32CD32', // Lime
];

function DraggableStaff({ staff, onDelete, onEdit, canEdit }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'STAFF',
    item: { staffId: staff.id, name: staff.name },
    canDrag: () => canEdit,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={canEdit ? drag : null}
      className={`staff-item ${isDragging ? 'dragging' : ''}`}
      style={{
        borderLeft: `4px solid ${staff.color}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: canEdit ? 'move' : 'default'
      }}
    >
      <span className="staff-name" style={{ color: staff.color }}>
        {staff.name}
      </span>
      {canEdit && (
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
      )}
    </div>
  );
}

function TaskLibrary({ staff, onAddStaff, onUpdateStaff, onDeleteStaff, canEdit = true }) {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffColor, setNewStaffColor] = useState(SATURATED_COLORS[0]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch unlinked users when form is shown
  useEffect(() => {
    if (showStaffForm && canEdit) {
      fetchUnlinkedUsers();
    }
  }, [showStaffForm, canEdit]);

  const fetchUnlinkedUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/unlinked`);
      setUnlinkedUsers(response.data);
    } catch (error) {
      console.error('Error loading unlinked users:', error);
      // If error, set empty array so form still works
      setUnlinkedUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaffName(staffMember.name);
    setNewStaffColor(staffMember.color);
    setSelectedUserId(staffMember.user_id || null);
    setShowStaffForm(true);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (newStaffName.trim()) {
      const staffData = {
        name: newStaffName.trim(),
        color: newStaffColor,
        user_id: selectedUserId
      };

      if (editingStaff) {
        // Update existing staff
        onUpdateStaff(editingStaff.id, staffData);
        setEditingStaff(null);
      } else {
        // Add new staff
        onAddStaff(staffData);
      }
      setNewStaffName('');
      setNewStaffColor(SATURATED_COLORS[0]);
      setSelectedUserId(null);
      setShowStaffForm(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setNewStaffName('');
    setNewStaffColor(SATURATED_COLORS[0]);
    setSelectedUserId(null);
    setShowStaffForm(false);
  };

  return (
    <div className="task-library">
      <div className="library-section">
        <div className="section-header">
          <h2>Staff Members</h2>
          {canEdit && (
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
          )}
        </div>

        {canEdit && showStaffForm && (
          <form className="add-form" onSubmit={handleSaveStaff}>
            <h3 className="form-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            <input
              type="text"
              placeholder="Staff name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              required
            />
            <div className="user-picker">
              <label>Link to User Account (Optional):</label>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={loadingUsers}
                className="user-select"
              >
                <option value="">-- No User Link --</option>
                {unlinkedUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
              {loadingUsers && <span className="loading-hint">Loading users...</span>}
            </div>
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

        <p className="library-hint">{canEdit ? 'Drag staff to assign tasks' : 'View only - no editing allowed'}</p>
        <div className="staff-list">
          {staff.map(s => (
            <DraggableStaff
              key={s.id}
              staff={s}
              onEdit={handleEditStaff}
              onDelete={onDeleteStaff}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TaskLibrary;
