-- Function to notify user about new message
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a notification if the sender and receiver are different
  IF NEW.sender_id != NEW.receiver_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (NEW.receiver_id, NEW.sender_id, 'message', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new message
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();
