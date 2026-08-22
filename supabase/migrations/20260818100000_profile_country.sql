ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;

GRANT UPDATE ON profiles TO authenticated;
