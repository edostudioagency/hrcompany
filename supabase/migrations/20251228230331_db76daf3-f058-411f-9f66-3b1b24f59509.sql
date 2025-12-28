-- Create user_companies table for multi-company management (admins)
CREATE TABLE public.user_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company associations"
ON public.user_companies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all company associations"
ON public.user_companies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to ensure only one default company per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.user_companies
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to maintain single default
CREATE TRIGGER ensure_single_default_company_trigger
BEFORE INSERT OR UPDATE ON public.user_companies
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_company();