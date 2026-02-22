
-- Fix: Restrict profile-images storage policies to prevent cross-user access

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;

-- Re-create public SELECT (needed for avatars to display)
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- INSERT: users can only upload to their own employee folder or admins can upload anywhere
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    -- Admin/manager can upload for any employee or company
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- Regular users: folder must match their employee ID
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);

-- UPDATE: same restriction
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);

-- DELETE: same restriction
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);
