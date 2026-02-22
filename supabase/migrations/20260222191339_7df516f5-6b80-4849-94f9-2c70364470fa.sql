ALTER TABLE public.time_off_requests
ADD COLUMN part_of_day text NOT NULL DEFAULT 'full_day';