// Get user initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Get border color based on user role
export const getRoleBorderColor = (role) => {
  const colors = {
    'admin': '#FD6A4F',
    'manager': '#FEA3C6',
    'staff': '#FEA3C6'
  };
  return colors[role.toLowerCase()] || '#FEA3C6';
};
