-- Create comment likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment likes
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comment likes" ON public.comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON public.comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to notify user about comment like
CREATE OR REPLACE FUNCTION handle_new_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
BEGIN
  -- Get the author of the comment
  SELECT user_id INTO comment_author_id FROM public.comments WHERE id = NEW.comment_id;

  -- Only create a notification if the liker is not the comment author
  IF NEW.user_id != comment_author_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (comment_author_id, NEW.user_id, 'like', NEW.comment_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_like_created ON public.comment_likes;
CREATE TRIGGER on_comment_like_created
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION handle_new_comment_like();
