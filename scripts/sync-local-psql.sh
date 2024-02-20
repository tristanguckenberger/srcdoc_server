#!/bin/bash

# Check if sufficient arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <DB_NAME> <DB_USER>"
    exit 1
fi

# Assign command-line arguments to variables
DB_NAME="$1"
DB_USER="$2"
DUMP_FILE="latest.dump"  # Path to your dump file

# Prompt for confirmation to proceed
read -p "This will replace the database '$DB_NAME' with user '$DB_USER'. Are you sure? (y/n) " -n 1 -r
echo    # Move to a new line

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Drop the existing database
    echo "Dropping existing database '$DB_NAME'..."
    dropdb --if-exists -h localhost -U "$DB_USER" "$DB_NAME"

    # Create a new database
    echo "Creating new database '$DB_NAME'..."
    createdb -h localhost -U "$DB_USER" "$DB_NAME"

    # Restore the database from the dump file
    echo "Restoring database from '$DUMP_FILE'..."
    pg_restore -O --clean --no-acl --no-owner -h localhost -U "$DB_USER" -d "$DB_NAME" "$DUMP_FILE" && echo "Database restored successfully." || echo "Failed to restore database."
else
    echo "Operation cancelled."
fi