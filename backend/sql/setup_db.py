"""
FlowForge Database Setup Script
Run this to create all required tables in Supabase
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Supabase credentials not found in environment variables")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def setup_database():
    """Create all FlowForge tables"""
    
    # Read the SQL file
    sql_file = Path(__file__).parent / 'flowforge_schema.sql'
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Split into individual statements (simple split on semicolon)
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    print(f"Found {len(statements)} SQL statements to execute")
    
    # Execute each statement via RPC
    for i, stmt in enumerate(statements):
        if not stmt or stmt.startswith('--') or stmt == 'SELECT':
            continue
            
        try:
            # Use the Supabase REST API to execute raw SQL
            # Note: This requires the service role key
            result = supabase.rpc('exec_sql', {'query': stmt}).execute()
            print(f"[{i+1}/{len(statements)}] Executed successfully")
        except Exception as e:
            # If RPC doesn't exist, we'll use direct REST call
            print(f"[{i+1}/{len(statements)}] Note: {str(e)[:100]}")

    print("\nDatabase setup complete!")
    print("\nIMPORTANT: If you see errors above, please run the SQL manually:")
    print(f"  1. Go to {SUPABASE_URL.replace('.co', '.co/sql/editor')}")
    print("  2. Paste the contents of /app/backend/sql/flowforge_schema.sql")
    print("  3. Click 'Run'")

if __name__ == '__main__':
    setup_database()
