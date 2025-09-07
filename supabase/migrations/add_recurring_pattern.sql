-- Add recurring_pattern column to mission_templates and mission_instances
-- This enables the recurring mission pattern functionality

-- Add recurring_pattern to mission_templates table
ALTER TABLE mission_templates 
ADD COLUMN recurring_pattern TEXT;

-- Add recurring_pattern to mission_instances table
ALTER TABLE mission_instances 
ADD COLUMN recurring_pattern TEXT;

-- Add check constraint to ensure valid recurring patterns
ALTER TABLE mission_templates 
ADD CONSTRAINT mission_templates_recurring_pattern_check 
CHECK (recurring_pattern IS NULL OR recurring_pattern IN (
  'daily', 'weekdays', 'weekends', 
  'weekly_sun', 'weekly_mon', 'weekly_tue', 'weekly_wed', 
  'weekly_thu', 'weekly_fri', 'weekly_sat'
));

-- Add check constraint for mission_instances as well
ALTER TABLE mission_instances 
ADD CONSTRAINT mission_instances_recurring_pattern_check 
CHECK (recurring_pattern IS NULL OR recurring_pattern IN (
  'daily', 'weekdays', 'weekends', 
  'weekly_sun', 'weekly_mon', 'weekly_tue', 'weekly_wed', 
  'weekly_thu', 'weekly_fri', 'weekly_sat'
));

-- Create index for performance
CREATE INDEX idx_mission_templates_recurring_pattern ON mission_templates(recurring_pattern);
CREATE INDEX idx_mission_instances_recurring_pattern ON mission_instances(recurring_pattern);