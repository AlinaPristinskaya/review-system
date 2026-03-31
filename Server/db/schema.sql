CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  allocated_hours NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (allocated_hours > 0 AND allocated_hours = ROUND(allocated_hours))
);

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS allocated_hours NUMERIC(10, 2) NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_allocated_hours_positive'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_allocated_hours_positive CHECK (allocated_hours > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_allocated_hours_integer'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_allocated_hours_integer CHECK (allocated_hours = ROUND(allocated_hours));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subcategories (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategory_source_values (
  subcategory_id BIGINT NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  metric_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  factor NUMERIC(12, 2) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subcategory_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id
  ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS effort_weights (
  from_rating INTEGER NOT NULL,
  to_rating INTEGER NOT NULL,
  effort_weight NUMERIC(12, 4) NOT NULL CHECK (effort_weight >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_rating, to_rating)
);

CREATE TABLE IF NOT EXISTS category_review_hours (
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  review_number INTEGER NOT NULL CHECK (review_number BETWEEN 1 AND 7),
  allocated_hours NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (allocated_hours >= 0),
  allocated_percent NUMERIC(8, 4) NOT NULL DEFAULT 0 CHECK (allocated_percent >= 0 AND allocated_percent <= 1),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (category_id, review_number)
);

ALTER TABLE category_review_hours
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE category_review_hours
  ADD COLUMN IF NOT EXISTS allocated_percent NUMERIC(8, 4) NOT NULL DEFAULT 0;

INSERT INTO effort_weights (from_rating, to_rating, effort_weight)
VALUES
  (0, 1, 0.06),
  (1, 2, 0.08),
  (2, 3, 0.10),
  (3, 4, 0.11),
  (4, 5, 0.13),
  (5, 6, 0.15),
  (6, 7, 0.17),
  (7, 8, 0.20)
ON CONFLICT (from_rating, to_rating) DO NOTHING;
