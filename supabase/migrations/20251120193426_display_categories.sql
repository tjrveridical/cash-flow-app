CREATE TABLE public.display_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_label TEXT NOT NULL,
  parent_id UUID REFERENCES public.display_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
