#!/bin/bash
# Script to clean the D1 database
# This will delete all data from all tables

echo "⚠️  WARNING: This will delete ALL data from the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo "Cleaning database..."
wrangler d1 execute optimii-db --file=scripts/clean-db.sql --remote

echo "✅ Database cleaned successfully!"
echo ""
echo "Next steps:"
echo "1. Delete users from Clerk dashboard"
echo "2. Sign up again to test the fresh start"

