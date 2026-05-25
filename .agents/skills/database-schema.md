-- Profiles: Stores user data and active religion
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  selected_religion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Places of Worship: Unified registration table
CREATE TABLE places_of_worship (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  religion_category TEXT NOT NULL,
  location_data JSONB, -- Lat/Lng, Address
  -- JSONB allows flexible data based on religion 
  -- (e.g., {"queue_type": "VIP/General", "parking_slots": 50} vs {"seating_capacity": 500, "wudu_area": true})
  facilities_config JSONB, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- User Progress & Data
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT, -- e.g., 'planner_saved', 'donation_made'
  details JSONB
);
