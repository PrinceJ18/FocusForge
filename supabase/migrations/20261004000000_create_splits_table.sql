/*
  # Splits Table — Phase 4C.2A

  Creates a persistent, user-owned splits table to replace the
  previous localStorage-only architecture.

  Schema maps directly to the existing frontend Split type:
    { id: string; name: string; amount: number; type: 'owe'|'owed'; date: string; settled: boolean }

  ## Security
  - RLS enabled
  - All policies require authenticated users
  - Users can only access their own data
*/

CREATE TABLE IF NOT EXISTS splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'owe' CHECK (type IN ('owe', 'owed')),
  date text NOT NULL DEFAULT '',
  settled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own splits"
  ON splits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own splits"
  ON splits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own splits"
  ON splits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own splits"
  ON splits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
