-- Function to allow users to delete their own account safely
-- Note: the auth.users table is managed by Supabase. We must use a security definer function
-- so the client can trigger its own deletion.

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (cascades down to profiles, posts, etc because of ON DELETE CASCADE)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
