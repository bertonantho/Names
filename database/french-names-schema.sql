-- French Baby Names Database Schema for Supabase
-- Based on the INSEE data structure from DS_PRENOM_2024_DATA.CSV

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE sex_type AS ENUM ('M', 'F');
CREATE TYPE geo_object_type AS ENUM ('FRANCE', 'REG', 'DEP');

-- Main table for French names with birth statistics
CREATE TABLE IF NOT EXISTS french_names (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name TEXT NOT NULL,
    geo TEXT NOT NULL, -- Department code (01, 02, etc.) or 'FRANCE' for national
    geo_object geo_object_type NOT NULL, -- FRANCE, REG, or DEP
    sex sex_type NOT NULL,
    time_period INTEGER NOT NULL, -- Year (2000-2024)
    obs_value INTEGER NOT NULL, -- Number of births
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Department information table
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE, -- Department code (01, 02, etc.)
    name TEXT NOT NULL, -- Department name (Ain, Aisne, etc.)
    region_code TEXT,
    region_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated data view for faster queries
CREATE TABLE IF NOT EXISTS name_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name TEXT NOT NULL,
    sex sex_type NOT NULL,
    total_births INTEGER NOT NULL, -- Total births across all years
    first_year INTEGER, -- First year this name appeared
    last_year INTEGER, -- Last year this name appeared
    peak_year INTEGER, -- Year with most births
    peak_births INTEGER, -- Number of births in peak year
    current_rank INTEGER, -- Current popularity rank
    trend_direction TEXT, -- 'rising', 'falling', 'stable'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(first_name, sex)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_french_names_name ON french_names(first_name);
CREATE INDEX IF NOT EXISTS idx_french_names_sex ON french_names(sex);
CREATE INDEX IF NOT EXISTS idx_french_names_year ON french_names(time_period);
CREATE INDEX IF NOT EXISTS idx_french_names_geo ON french_names(geo);
CREATE INDEX IF NOT EXISTS idx_french_names_geo_object ON french_names(geo_object);
CREATE INDEX IF NOT EXISTS idx_french_names_composite ON french_names(first_name, sex, time_period);
CREATE INDEX IF NOT EXISTS idx_french_names_dept_year ON french_names(geo, time_period) WHERE geo_object = 'DEP';

-- Indexes for statistics table
CREATE INDEX IF NOT EXISTS idx_name_statistics_name ON name_statistics(first_name);
CREATE INDEX IF NOT EXISTS idx_name_statistics_sex ON name_statistics(sex);
CREATE INDEX IF NOT EXISTS idx_name_statistics_rank ON name_statistics(current_rank);
CREATE INDEX IF NOT EXISTS idx_name_statistics_total ON name_statistics(total_births);

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Full-text search index for name searching
CREATE INDEX IF NOT EXISTS idx_french_names_search ON french_names USING gin(to_tsvector('french', first_name));
CREATE INDEX IF NOT EXISTS idx_name_statistics_search ON name_statistics USING gin(to_tsvector('french', first_name));

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_french_names_updated_at
    BEFORE UPDATE ON french_names
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_name_statistics_updated_at
    BEFORE UPDATE ON name_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get name details with yearly data
CREATE OR REPLACE FUNCTION get_name_details(
    p_name TEXT,
    p_sex sex_type
)
RETURNS TABLE (
    year INTEGER,
    births INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fn.time_period,
        fn.obs_value,
        COALESCE(
            (SELECT COUNT(*) + 1 
             FROM french_names fn2 
             WHERE fn2.time_period = fn.time_period 
               AND fn2.sex = fn.sex 
               AND fn2.geo_object = 'FRANCE'
               AND fn2.obs_value > fn.obs_value),
            1
        )::INTEGER as rank
    FROM french_names fn
    WHERE fn.first_name = p_name
      AND fn.sex = p_sex
      AND fn.geo_object = 'FRANCE'
    ORDER BY fn.time_period;
END;
$$ LANGUAGE plpgsql;

-- Function to get department data for a name/year
CREATE OR REPLACE FUNCTION get_department_data(
    p_name TEXT,
    p_sex sex_type,
    p_year INTEGER
)
RETURNS TABLE (
    department_code TEXT,
    department_name TEXT,
    births INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fn.geo,
        COALESCE(d.name, fn.geo) as dept_name,
        fn.obs_value
    FROM french_names fn
    LEFT JOIN departments d ON d.code = fn.geo
    WHERE fn.first_name = p_name
      AND fn.sex = p_sex
      AND fn.time_period = p_year
      AND fn.geo_object = 'DEP'
      AND fn.geo ~ '^[0-9]{2}$'  -- Only metropolitan departments
      AND fn.geo::INTEGER BETWEEN 1 AND 95
    ORDER BY fn.obs_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search names
CREATE OR REPLACE FUNCTION search_names(
    p_query TEXT,
    p_sex sex_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    name TEXT,
    sex sex_type,
    total_births INTEGER,
    current_rank INTEGER,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.first_name,
        ns.sex,
        ns.total_births,
        ns.current_rank,
        ns.trend_direction
    FROM name_statistics ns
    WHERE (p_sex IS NULL OR ns.sex = p_sex)
      AND (
        ns.first_name ILIKE '%' || p_query || '%'
        OR to_tsvector('french', ns.first_name) @@ plainto_tsquery('french', p_query)
      )
    ORDER BY 
        CASE WHEN ns.first_name ILIKE p_query || '%' THEN 1 ELSE 2 END,
        ns.total_births DESC,
        ns.first_name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending names
CREATE OR REPLACE FUNCTION get_trending_names(
    p_sex sex_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    name TEXT,
    sex sex_type,
    current_births INTEGER,
    previous_births INTEGER,
    trend_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH current_year_data AS (
        SELECT 
            fn.first_name,
            fn.sex,
            fn.obs_value as current_births
        FROM french_names fn
        WHERE fn.geo_object = 'FRANCE'
          AND fn.time_period = (SELECT MAX(time_period) FROM french_names WHERE geo_object = 'FRANCE')
          AND (p_sex IS NULL OR fn.sex = p_sex)
    ),
    previous_year_data AS (
        SELECT 
            fn.first_name,
            fn.sex,
            fn.obs_value as previous_births
        FROM french_names fn
        WHERE fn.geo_object = 'FRANCE'
          AND fn.time_period = (SELECT MAX(time_period) - 1 FROM french_names WHERE geo_object = 'FRANCE')
          AND (p_sex IS NULL OR fn.sex = p_sex)
    )
    SELECT 
        c.first_name,
        c.sex,
        c.current_births,
        COALESCE(p.previous_births, 0) as previous_births,
        CASE 
            WHEN p.previous_births IS NULL OR p.previous_births = 0 THEN 100.0
            ELSE ROUND(((c.current_births - p.previous_births)::NUMERIC / p.previous_births * 100), 2)
        END as trend_percentage
    FROM current_year_data c
    LEFT JOIN previous_year_data p ON c.first_name = p.first_name AND c.sex = p.sex
    WHERE c.current_births >= 10  -- Only names with significant usage
    ORDER BY trend_percentage DESC, c.current_births DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) - Make data publicly readable
ALTER TABLE french_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE name_statistics ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for french_names" ON french_names
    FOR SELECT USING (true);

CREATE POLICY "Public read access for departments" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Public read access for name_statistics" ON name_statistics
    FOR SELECT USING (true);

-- Insert sample departments data (this will be populated by migration script)
INSERT INTO departments (code, name, region_name) VALUES
('01', 'Ain', 'Auvergne-Rhône-Alpes'),
('02', 'Aisne', 'Hauts-de-France'),
('03', 'Allier', 'Auvergne-Rhône-Alpes'),
('04', 'Alpes-de-Haute-Provence', 'Provence-Alpes-Côte d''Azur'),
('05', 'Hautes-Alpes', 'Provence-Alpes-Côte d''Azur'),
('06', 'Alpes-Maritimes', 'Provence-Alpes-Côte d''Azur'),
('07', 'Ardèche', 'Auvergne-Rhône-Alpes'),
('08', 'Ardennes', 'Grand Est'),
('09', 'Ariège', 'Occitanie'),
('10', 'Aube', 'Grand Est')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE french_names IS 'Raw data from INSEE DS_PRENOM dataset with birth statistics by name, sex, geography and year';
COMMENT ON TABLE departments IS 'French department codes and names for geographic mapping';
COMMENT ON TABLE name_statistics IS 'Aggregated statistics for faster name searches and ranking';
COMMENT ON FUNCTION get_name_details IS 'Returns yearly birth data and rankings for a specific name';
COMMENT ON FUNCTION get_department_data IS 'Returns department-level birth data for a name in a specific year';
COMMENT ON FUNCTION search_names IS 'Full-text search for names with filters';
COMMENT ON FUNCTION get_trending_names IS 'Returns names with highest growth between recent years'; 