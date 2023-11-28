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
--ALTER TABLE games ADD COLUMN created_date timestamp DEFAULT current_timestamp;

-- Add updated_date column
--ALTER TABLE games ADD COLUMN updated_date timestamp;

-- Create or replace function to update 'updated_date'
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = current_timestamp;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update 'updated_date'
CREATE TRIGGER update_updated_at_trigger
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION set_initial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_updated_at_trigger
BEFORE INSERT ON games
FOR EACH ROW EXECUTE FUNCTION set_initial_updated_at();

CREATE TRIGGER set_initial_updated_at
AFTER INSERT ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add is_active column
ALTER TABLE users ALTER COLUMN is_active boolean DEFAULT false;

CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(user_id, game_id),
    created_at timestamp DEFAULT current_timestamp
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    UNIQUE(user_id, game_id),
    created_at timestamp DEFAULT current_timestamp
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES comments(id),
    comment_text TEXT,
    created_at timestamp DEFAULT current_timestamp,
    updated_at timestamp DEFAULT current_timestamp
);

CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    issue_text TEXT,
    created_at timestamp DEFAULT current_timestamp,
    updated_at timestamp DEFAULT current_timestamp
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    content TEXT,
    published BOOLEAN DEFAULT false,
    created_at timestamp DEFAULT current_timestamp,
    updated_at timestamp DEFAULT current_timestamp
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    parent_file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    name VARCHAR(255),
    type VARCHAR(50),
    content TEXT,
    created_at timestamp DEFAULT current_timestamp,
    updated_at timestamp DEFAULT current_timestamp
);


CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE game_tags (
    game_id INTEGER REFERENCES games(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (game_id, tag_id)
);