-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE gender_type AS ENUM ('boy', 'girl', 'unisex');

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create names table
CREATE TABLE IF NOT EXISTS names (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gender gender_type NOT NULL,
    origin TEXT NOT NULL,
    meaning TEXT NOT NULL,
    popularity_rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name_id UUID REFERENCES names(id) ON DELETE CASCADE NOT NULL,
    collection_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender);
CREATE INDEX IF NOT EXISTS idx_names_origin ON names(origin);
CREATE INDEX IF NOT EXISTS idx_names_popularity ON names(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_names_name_search ON names USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_name_id ON favorites(name_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_names_updated_at
    BEFORE UPDATE ON names
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Collections policies
CREATE POLICY "Users can view their own collections" ON collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared collections" ON collections
    FOR SELECT USING (is_shared = true);

CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON favorites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Names table is public (no RLS needed)
-- Everyone can read names, but only authenticated users can suggest new ones
CREATE POLICY "Anyone can view names" ON names
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert names" ON names
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Sample data for testing
INSERT INTO names (name, gender, origin, meaning, popularity_rank) VALUES
('Emma', 'girl', 'Germanic', 'Universal, whole', 1),
('Liam', 'boy', 'Irish', 'Strong-willed warrior', 1),
('Olivia', 'girl', 'Latin', 'Olive tree', 2),
('Noah', 'boy', 'Hebrew', 'Rest, comfort', 2),
('Ava', 'girl', 'Latin', 'Life, bird', 3),
('Oliver', 'boy', 'Latin', 'Olive tree', 3),
('Isabella', 'girl', 'Hebrew', 'Pledged to God', 4),
('Elijah', 'boy', 'Hebrew', 'My God is Yahweh', 4),
('Sophia', 'girl', 'Greek', 'Wisdom', 5),
('William', 'boy', 'Germanic', 'Resolute protector', 5),
('Charlotte', 'girl', 'French', 'Free man', 6),
('James', 'boy', 'Hebrew', 'Supplanter', 6),
('Amelia', 'girl', 'Germanic', 'Work', 7),
('Benjamin', 'boy', 'Hebrew', 'Son of the right hand', 7),
('Mia', 'girl', 'Scandinavian', 'Mine, bitter', 8),
('Lucas', 'boy', 'Latin', 'Light', 8),
('Harper', 'girl', 'English', 'Harp player', 9),
('Henry', 'boy', 'Germanic', 'Estate ruler', 9),
('Evelyn', 'girl', 'English', 'Wished for child', 10),
('Alexander', 'boy', 'Greek', 'Defender of men', 10),
('Abigail', 'girl', 'Hebrew', 'My father is joy', 11),
('Michael', 'boy', 'Hebrew', 'Who is like God?', 11),
('Emily', 'girl', 'Latin', 'Rival', 12),
('Mason', 'boy', 'English', 'Stone worker', 12),
('Elizabeth', 'girl', 'Hebrew', 'Pledged to God', 13),
('Ethan', 'boy', 'Hebrew', 'Strong, firm', 13),
('Mila', 'girl', 'Slavic', 'Gracious, dear', 14),
('Daniel', 'boy', 'Hebrew', 'God is my judge', 14),
('Ella', 'girl', 'Germanic', 'All, completely', 15),
('Jacob', 'boy', 'Hebrew', 'Supplanter', 15),
('Avery', 'unisex', 'English', 'Ruler of the elves', 16),
('Logan', 'unisex', 'Scottish', 'Little hollow', 17),
('Riley', 'unisex', 'Irish', 'Courageous', 18),
('Jordan', 'unisex', 'Hebrew', 'Flowing down', 19),
('Taylor', 'unisex', 'English', 'Tailor', 20)
ON CONFLICT (name) DO NOTHING; 