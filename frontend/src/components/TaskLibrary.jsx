import { useState } from 'react';
import { useDrag } from 'react-dnd';
import './TaskLibrary.css';

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

function DraggableStaff({ staff, onDelete, onEdit }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'STAFF',
    item: { staffId: staff.id, name: staff.name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`staff-item ${isDragging ? 'dragging' : ''}`}
      style={{
        borderLeft: `4px solid ${staff.color}`,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <span className="staff-name" style={{ color: staff.color }}>
        {staff.name}
      </span>
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
    </div>
  );
}

function TaskLibrary({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }) {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffColor, setNewStaffColor] = useState(SATURATED_COLORS[0]);

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaffName(staffMember.name);
    setNewStaffColor(staffMember.color);
    setShowStaffForm(true);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (newStaffName.trim()) {
      if (editingStaff) {
        // Update existing staff
        onUpdateStaff(editingStaff.id, {
          name: newStaffName.trim(),
          color: newStaffColor
        });
        setEditingStaff(null);
      } else {
        // Add new staff
        onAddStaff({
          name: newStaffName.trim(),
          color: newStaffColor
        });
      }
      setNewStaffName('');
      setNewStaffColor(SATURATED_COLORS[0]);
      setShowStaffForm(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setNewStaffName('');
    setNewStaffColor(SATURATED_COLORS[0]);
    setShowStaffForm(false);
  };

  return (
    <div className="task-library">
      <div className="library-section">
        <div className="section-header">
          <h2>Staff Members</h2>
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
        </div>

        {showStaffForm && (
          <form className="add-form" onSubmit={handleSaveStaff}>
            <h3 className="form-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            <input
              type="text"
              placeholder="Staff name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              required
            />
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

        <p className="library-hint">Drag staff to assign tasks</p>
        <div className="staff-list">
          {staff.map(s => (
            <DraggableStaff
              key={s.id}
              staff={s}
              onEdit={handleEditStaff}
              onDelete={onDeleteStaff}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TaskLibrary;
