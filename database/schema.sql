-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE gender_type AS ENUM ('boy', 'girl', 'unisex');
CREATE TYPE collection_role AS ENUM ('owner', 'collaborator', 'viewer');

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collections table (updated for collaboration)
CREATE TABLE IF NOT EXISTS collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can anyone discover this collection?
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_members table (who has access to which collections)
CREATE TABLE IF NOT EXISTS collection_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role collection_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(collection_id, user_id)
);

-- Create collection_invitations table (pending invitations by email)
CREATE TABLE IF NOT EXISTS collection_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role collection_role NOT NULL DEFAULT 'collaborator',
    invitation_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(collection_id, invited_email)
);

-- Create favorites table (now properly linked to collections)
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name_text TEXT NOT NULL, -- The actual name string (e.g., "Emma")
    name_gender TEXT NOT NULL, -- 'M' or 'F' to distinguish same names with different genders
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL, -- Proper foreign key
    notes TEXT, -- Personal notes about why they like this name
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who added this to the collection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name_text, name_gender, collection_id) -- Allow same name in different collections
);

-- Create dislikes table (references names by string identifier)
CREATE TABLE IF NOT EXISTS dislikes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name_text TEXT NOT NULL, -- The actual name string (e.g., "Emma")
    name_gender TEXT NOT NULL, -- 'M' or 'F' to distinguish same names with different genders
    reason TEXT, -- Optional: why they dislike it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name_text, name_gender)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collection_members_collection_id ON collection_members(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_user_id ON collection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_collection_id ON collection_invitations(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_email ON collection_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_token ON collection_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_collection_id ON favorites(collection_id);
CREATE INDEX IF NOT EXISTS idx_favorites_name_text ON favorites(name_text);
CREATE INDEX IF NOT EXISTS idx_favorites_name_gender ON favorites(name_gender);
CREATE INDEX IF NOT EXISTS idx_dislikes_user_id ON dislikes(user_id);
CREATE INDEX IF NOT EXISTS idx_dislikes_name_text ON dislikes(name_text);
CREATE INDEX IF NOT EXISTS idx_dislikes_name_gender ON dislikes(name_gender);

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

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE dislikes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Collections policies
CREATE POLICY "Users can view collections they have access to" ON collections
    FOR SELECT USING (
        is_public = true OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM collection_members 
            WHERE collection_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Collection owners can update their collections" ON collections
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Collection owners can delete their collections" ON collections
    FOR DELETE USING (auth.uid() = created_by);

-- Collection members policies
CREATE POLICY "Users can view collection memberships they're part of" ON collection_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM collections 
            WHERE id = collection_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Collection owners can manage memberships" ON collection_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collections 
            WHERE id = collection_id AND created_by = auth.uid()
        )
    );

-- Collection invitations policies
CREATE POLICY "Users can view invitations for their collections" ON collection_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM collections 
            WHERE id = collection_id AND created_by = auth.uid()
        ) OR
        (invited_email = (SELECT email FROM profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Users can create invitations for their collections" ON collection_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = invited_by AND
        EXISTS (
            SELECT 1 FROM collections 
            WHERE id = collection_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update invitations for their collections" ON collection_invitations
    FOR UPDATE USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM collections 
            WHERE id = collection_id AND created_by = auth.uid()
        )
    );

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view favorites in collections they have access to" ON favorites
    FOR SELECT USING (
        auth.uid() = user_id OR
        (collection_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM collection_members 
            WHERE collection_id = favorites.collection_id AND user_id = auth.uid()
        ))
    );

CREATE POLICY "Users can insert their own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON favorites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Dislikes policies (unchanged)
CREATE POLICY "Users can view their own dislikes" ON dislikes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dislikes" ON dislikes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dislikes" ON dislikes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dislikes" ON dislikes
    FOR DELETE USING (auth.uid() = user_id);

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

-- Function to automatically add collection creator as owner
CREATE OR REPLACE FUNCTION add_collection_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO collection_members (collection_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.created_by, 'owner', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add creator as collection owner
CREATE TRIGGER add_collection_creator_as_member_trigger
    AFTER INSERT ON collections
    FOR EACH ROW
    EXECUTE FUNCTION add_collection_creator_as_member();

-- Function to prevent conflicting favorites/dislikes
CREATE OR REPLACE FUNCTION prevent_favorite_dislike_conflict()
RETURNS TRIGGER AS $$
BEGIN
    -- If inserting/updating favorites, check if dislike exists
    IF TG_TABLE_NAME = 'favorites' THEN
        IF EXISTS (
            SELECT 1 FROM dislikes 
            WHERE user_id = NEW.user_id 
            AND name_text = NEW.name_text 
            AND name_gender = NEW.name_gender
        ) THEN
            RAISE EXCEPTION 'Cannot favorite a name that is already disliked. Remove from dislikes first.';
        END IF;
    END IF;
    
    -- If inserting/updating dislikes, check if favorite exists
    IF TG_TABLE_NAME = 'dislikes' THEN
        IF EXISTS (
            SELECT 1 FROM favorites 
            WHERE user_id = NEW.user_id 
            AND name_text = NEW.name_text 
            AND name_gender = NEW.name_gender
        ) THEN
            RAISE EXCEPTION 'Cannot dislike a name that is already favorited. Remove from favorites first.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add conflict prevention triggers
CREATE TRIGGER prevent_favorite_dislike_conflict_favorites
    BEFORE INSERT OR UPDATE ON favorites
    FOR EACH ROW
    EXECUTE FUNCTION prevent_favorite_dislike_conflict();

CREATE TRIGGER prevent_favorite_dislike_conflict_dislikes
    BEFORE INSERT OR UPDATE ON dislikes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_favorite_dislike_conflict(); 