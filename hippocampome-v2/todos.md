# Manual Setup Tasks

## 1. Create Supabase Project
- Go to https://supabase.com/dashboard and create a new project
- Copy the project URL and anon key
- Create `.env.local` from `.env.local.example` and fill in credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

## 2. Run Database Migrations
- In the Supabase SQL editor, run the migrations in order:
  1. `supabase/migrations/00001_initial_schema.sql` — Creates all tables
  2. `supabase/migrations/00002_search_and_rpc.sql` — Creates search views and RPC functions
- Alternatively, install the Supabase CLI and run `supabase db push`

## 3. Import Data
- The data migration scripts in `scripts/` need to be run to populate the database
- You'll need access to either:
  - A MySQL dump of the live Hippocampome database (the ones in `/import/` are from 2012)
  - Or the CSV files in the original repo's `/data/` and `/synap_prob/data/` directories
- Run: `npx tsx scripts/import-csv-data.ts` (after writing the import scripts)

## 4. Enable Row Level Security
- In Supabase dashboard, enable RLS on all tables
- Add a "public read" policy to each table:
  ```sql
  CREATE POLICY "public_read" ON table_name FOR SELECT USING (true);
  ```
- This makes the database read-only for anonymous users

## 5. Data Sources Needed
- **Live MySQL database access** — the SQL dumps in the repo are from 2012. The live site
  at hippocampome.org has significantly more data. You'd need a fresh mysqldump or
  direct MySQL connection to get the current dataset.
- If you only have the 2012 dumps + CSV files, the migration scripts can work with those,
  but you'll be missing newer neuron types, firing patterns, Izhikevich models, etc.

## 6. Optional: Generate Supabase Types
- Install Supabase CLI: `npm install -g supabase`
- Run: `supabase gen types typescript --project-id your-project-id > src/types/supabase.ts`
- This generates exact TypeScript types from your database schema
