-- Add profile_photo column
ALTER TABLE users ADD COLUMN profile_photo text;

-- Add bio column
ALTER TABLE users ADD COLUMN bio text;

-- Add created_date column with default current timestamp
ALTER TABLE users ADD COLUMN created_date timestamp DEFAULT current_timestamp;

-- Add updated_date column
ALTER TABLE users ADD COLUMN updated_date timestamp;

-- Create or replace function to update 'updated_date'
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = current_timestamp;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update 'updated_date'
CREATE TRIGGER update_updated_date_trigger
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE OR REPLACE FUNCTION set_initial_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NEW.created_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_updated_date_trigger
BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION set_initial_updated_date();

CREATE TRIGGER set_initial_updated_date
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_date();




/////////////



-- Add created_date column with default current timestamp
ALTER TABLE games ADD COLUMN created_date timestamp DEFAULT current_timestamp;

-- Add updated_date column
ALTER TABLE games ADD COLUMN updated_date timestamp;

-- Create or replace function to update 'updated_date'
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = current_timestamp;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update 'updated_date'
CREATE TRIGGER update_updated_date_trigger
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE OR REPLACE FUNCTION set_initial_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NEW.created_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_updated_date_trigger
BEFORE INSERT ON games
FOR EACH ROW EXECUTE FUNCTION set_initial_updated_date();

CREATE TRIGGER set_initial_updated_date
AFTER INSERT ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_date();