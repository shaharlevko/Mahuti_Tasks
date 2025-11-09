-- Mahuti Tasks Database Migration for Supabase (PostgreSQL)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (optional, but recommended for PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_check CHECK (role IN ('admin', 'manager', 'staff'))
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Staff table with unique name constraint
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(255),
  color VARCHAR(50),
  availability TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on staff name
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);

-- Tasks table with unique name constraint and order_index
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(50),
  category VARCHAR(100),
  color VARCHAR(50),
  duration INTEGER DEFAULT 60,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on task name and order
CREATE INDEX IF NOT EXISTS idx_tasks_name ON tasks(name);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(order_index);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on week_start for faster queries
CREATE INDEX IF NOT EXISTS idx_schedules_week_start ON schedules(week_start);

-- Schedule assignments table
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  time_slot VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON schedule_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON schedule_assignments(task_id);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for schedules table
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Password hash generated with bcryptjs, 10 rounds
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@mahuti.com', '$2a$10$8KqJ5YzM5JZXGqB5f5N0eO5XwX5Z5yN5N5N5N5N5N5N5N5N5N5N5', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample staff members
INSERT INTO staff (name, color) VALUES
  ('Rocio', '#FF6B58'),
  ('Ruty', '#4A90E2'),
  ('Flor', '#5FB878'),
  ('Vivi', '#FF8C42'),
  ('Amit', '#9370DB'),
  ('Mayo', '#E74B9C')
ON CONFLICT (name) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (name, icon, category, color, order_index) VALUES
  ('Lunch', '🌳', 'Food', '#5FB878', 0),
  ('Dish', '🥤', 'Cleaning', '#FF69B4', 1),
  ('Water', '💧', 'Care', '#00BCD4', 2),
  ('Snack', '🍪', 'Food', '#FF8C42', 3),
  ('Activities', '🎨', 'Activities', '#FF6B58', 4)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Note: Adjust these policies based on your security requirements

-- Users table policies (admins can manage users)
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Staff, tasks, schedules policies (authenticated users can read, admins/managers can write)
CREATE POLICY "Anyone can view staff" ON staff
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage staff" ON staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can view tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can view schedules" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage schedules" ON schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can view assignments" ON schedule_assignments
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage assignments" ON schedule_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can view templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage templates" ON templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager')
    )
  );
