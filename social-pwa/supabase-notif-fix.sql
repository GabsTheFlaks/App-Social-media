-- Add reference_id to notifications to support messages and comment likes
ALTER TABLE public.notifications
ADD COLUMN reference_id UUID;
