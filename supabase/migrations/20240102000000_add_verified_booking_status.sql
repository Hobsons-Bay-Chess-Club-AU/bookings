-- Add 'verified' status to booking_status enum
ALTER TYPE booking_status ADD VALUE 'verified';

-- Update the event attendee count trigger to also count verified bookings
CREATE OR REPLACE FUNCTION update_event_attendees()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.status = 'confirmed' OR NEW.status = 'verified') THEN
    UPDATE events 
    SET current_attendees = current_attendees + NEW.quantity
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status != 'confirmed' AND OLD.status != 'verified') AND (NEW.status = 'confirmed' OR NEW.status = 'verified') THEN
      UPDATE events 
      SET current_attendees = current_attendees + NEW.quantity
      WHERE id = NEW.event_id;
    ELSIF (OLD.status = 'confirmed' OR OLD.status = 'verified') AND (NEW.status != 'confirmed' AND NEW.status != 'verified') THEN
      UPDATE events 
      SET current_attendees = current_attendees - OLD.quantity
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND (OLD.status = 'confirmed' OR OLD.status = 'verified') THEN
    UPDATE events 
    SET current_attendees = current_attendees - OLD.quantity
    WHERE id = OLD.event_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';