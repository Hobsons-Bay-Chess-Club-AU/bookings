-- Create a function to clean up old pending bookings
CREATE OR REPLACE FUNCTION cleanup_old_pending_bookings()
RETURNS void AS $$
BEGIN
  -- Delete pending bookings older than 1 hour
  DELETE FROM bookings 
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run cleanup every hour
-- Note: This is a simplified approach. In production, you might want to use a proper cron job
CREATE OR REPLACE FUNCTION trigger_cleanup_old_pending_bookings()
RETURNS trigger AS $$
BEGIN
  -- Only run cleanup occasionally to avoid performance issues
  -- This will run cleanup roughly every 100th booking creation
  IF (random() < 0.01) THEN
    PERFORM cleanup_old_pending_bookings();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS cleanup_pending_bookings_trigger ON bookings;
CREATE TRIGGER cleanup_pending_bookings_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_old_pending_bookings();

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_old_pending_bookings() IS 'Cleans up pending bookings older than 1 hour';
COMMENT ON FUNCTION trigger_cleanup_old_pending_bookings() IS 'Trigger function to occasionally clean up old pending bookings'; 