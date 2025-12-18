-- ============================================
-- NYAAY SAATHI - CHAT SYSTEM MIGRATION
-- Version: 3.0
-- Description: User-Lawyer real-time messaging system
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Chat room status
DO $$ BEGIN
    CREATE TYPE chat_room_status AS ENUM ('active', 'archived', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Message status
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Message type
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'document', 'system');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CHAT ROOMS TABLE
-- A chat room is created per consultation between user and lawyer
-- ============================================

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Participants
    consultation_id UUID UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Room metadata
    status chat_room_status DEFAULT 'active',
    
    -- Message counters (denormalized for performance)
    total_messages INTEGER DEFAULT 0,
    user_unread_count INTEGER DEFAULT 0,
    lawyer_unread_count INTEGER DEFAULT 0,
    
    -- Last activity tracking
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender_id UUID,
    
    -- User activity tracking
    user_last_seen_at TIMESTAMPTZ,
    lawyer_last_seen_at TIMESTAMPTZ,
    user_typing_at TIMESTAMPTZ,
    lawyer_typing_at TIMESTAMPTZ,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_rooms
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user ON chat_rooms(user_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_lawyer ON chat_rooms(lawyer_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_consultation ON chat_rooms(consultation_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON chat_rooms(status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_unread ON chat_rooms(user_id, user_unread_count) WHERE user_unread_count > 0 AND NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_lawyer_unread ON chat_rooms(lawyer_id, lawyer_unread_count) WHERE lawyer_unread_count > 0 AND NOT is_deleted;

-- ============================================
-- CHAT MESSAGES TABLE
-- Individual messages within a chat room
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Room reference
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    
    -- Sender
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'lawyer', 'system')),
    
    -- Message content
    message_type message_type DEFAULT 'text',
    content TEXT,
    
    -- File attachment (for file/image/document types)
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER, -- in bytes
    file_mime_type VARCHAR(100),
    thumbnail_url TEXT, -- for images
    
    -- Message status
    status message_status DEFAULT 'sent',
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Reply/thread support
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Edit tracking
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    original_content TEXT,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_for_all BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(room_id, status) WHERE status != 'read';
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(room_id, message_type) WHERE message_type != 'text';

-- ============================================
-- CHAT ATTACHMENTS TABLE
-- For managing file uploads separately
-- ============================================

CREATE TABLE IF NOT EXISTS chat_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File details
    file_name VARCHAR(255) NOT NULL,
    file_original_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(20),
    
    -- Storage
    storage_path TEXT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'supabase', -- supabase, s3, azure
    public_url TEXT,
    thumbnail_path TEXT,
    thumbnail_url TEXT,
    
    -- Processing status
    is_processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    
    -- Virus scan (production requirement)
    is_scanned BOOLEAN DEFAULT FALSE,
    scan_result VARCHAR(50), -- clean, infected, error
    scanned_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_attachments
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_room ON chat_attachments(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_uploader ON chat_attachments(uploaded_by);

-- ============================================
-- CHAT READ RECEIPTS TABLE
-- Track individual message read status per user
-- ============================================

CREATE TABLE IF NOT EXISTS chat_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per room per user
    UNIQUE(room_id, user_id)
);

-- Index for read receipts
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_room ON chat_read_receipts(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_user ON chat_read_receipts(user_id);

-- ============================================
-- CHAT PRESENCE TABLE
-- Track online status and typing indicators
-- ============================================

CREATE TABLE IF NOT EXISTS chat_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Online status
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Connection info
    socket_id VARCHAR(100),
    device_type VARCHAR(50),
    device_info JSONB DEFAULT '{}',
    
    -- Current activity
    current_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
    typing_started_at TIMESTAMPTZ,
    
    -- Timestamps
    connected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for presence
CREATE INDEX IF NOT EXISTS idx_chat_presence_online ON chat_presence(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_chat_presence_room ON chat_presence(current_room_id) WHERE current_room_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- Chat Rooms: Users can only see their own rooms
CREATE POLICY chat_rooms_select ON chat_rooms FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT user_id FROM lawyers WHERE id = chat_rooms.lawyer_id) OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );

CREATE POLICY chat_rooms_insert ON chat_rooms FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY chat_rooms_update ON chat_rooms FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT user_id FROM lawyers WHERE id = chat_rooms.lawyer_id) OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );

-- Chat Messages: Users can only see messages in their rooms
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE user_id = auth.uid() 
            OR lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())
        ) OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );

CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT
    WITH CHECK (
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE user_id = auth.uid() 
            OR lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())
        )
    );

CREATE POLICY chat_messages_update ON chat_messages FOR UPDATE
    USING (sender_id = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Chat Attachments: Same as messages
CREATE POLICY chat_attachments_select ON chat_attachments FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE user_id = auth.uid() 
            OR lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())
        ) OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );

CREATE POLICY chat_attachments_insert ON chat_attachments FOR INSERT
    WITH CHECK (uploaded_by = auth.uid());

-- Read Receipts: Users can only see their own
CREATE POLICY chat_read_receipts_select ON chat_read_receipts FOR SELECT
    USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY chat_read_receipts_insert ON chat_read_receipts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_read_receipts_update ON chat_read_receipts FOR UPDATE
    USING (user_id = auth.uid());

-- Presence: Users can only manage their own
CREATE POLICY chat_presence_select ON chat_presence FOR SELECT
    USING (TRUE); -- Everyone can see online status

CREATE POLICY chat_presence_insert ON chat_presence FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_presence_update ON chat_presence FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update chat room on new message
CREATE OR REPLACE FUNCTION update_chat_room_on_message()
RETURNS TRIGGER AS $$
DECLARE
    v_room RECORD;
    v_sender_is_user BOOLEAN;
BEGIN
    -- Get room details
    SELECT * INTO v_room FROM chat_rooms WHERE id = NEW.room_id;
    
    -- Determine if sender is user or lawyer
    v_sender_is_user := (NEW.sender_id = v_room.user_id);
    
    -- Update room
    UPDATE chat_rooms SET
        total_messages = total_messages + 1,
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        last_message_sender_id = NEW.sender_id,
        -- Increment unread count for the other party
        user_unread_count = CASE 
            WHEN NOT v_sender_is_user THEN user_unread_count + 1 
            ELSE user_unread_count 
        END,
        lawyer_unread_count = CASE 
            WHEN v_sender_is_user THEN lawyer_unread_count + 1 
            ELSE lawyer_unread_count 
        END,
        updated_at = NOW()
    WHERE id = NEW.room_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_update_room_on_message ON chat_messages;
CREATE TRIGGER trigger_update_room_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    WHEN (NEW.message_type != 'system')
    EXECUTE FUNCTION update_chat_room_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_room_id UUID,
    p_user_id UUID,
    p_up_to_message_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_room RECORD;
    v_is_user BOOLEAN;
BEGIN
    -- Get room details
    SELECT * INTO v_room FROM chat_rooms WHERE id = p_room_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Determine if caller is user or lawyer
    v_is_user := (p_user_id = v_room.user_id);
    
    -- Update messages
    IF p_up_to_message_id IS NOT NULL THEN
        UPDATE chat_messages SET
            status = 'read',
            read_at = NOW()
        WHERE room_id = p_room_id
        AND sender_id != p_user_id
        AND status != 'read'
        AND created_at <= (SELECT created_at FROM chat_messages WHERE id = p_up_to_message_id);
    ELSE
        UPDATE chat_messages SET
            status = 'read',
            read_at = NOW()
        WHERE room_id = p_room_id
        AND sender_id != p_user_id
        AND status != 'read';
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Reset unread count for the user
    IF v_is_user THEN
        UPDATE chat_rooms SET user_unread_count = 0, user_last_seen_at = NOW() WHERE id = p_room_id;
    ELSE
        UPDATE chat_rooms SET lawyer_unread_count = 0, lawyer_last_seen_at = NOW() WHERE id = p_room_id;
    END IF;
    
    -- Update read receipt
    INSERT INTO chat_read_receipts (room_id, user_id, last_read_message_id, last_read_at)
    VALUES (p_room_id, p_user_id, COALESCE(p_up_to_message_id, (
        SELECT id FROM chat_messages WHERE room_id = p_room_id ORDER BY created_at DESC LIMIT 1
    )), NOW())
    ON CONFLICT (room_id, user_id) DO UPDATE SET
        last_read_message_id = EXCLUDED.last_read_message_id,
        last_read_at = NOW();
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create chat room for consultation
CREATE OR REPLACE FUNCTION get_or_create_chat_room(
    p_consultation_id UUID,
    p_user_id UUID,
    p_lawyer_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_room_id UUID;
BEGIN
    -- Try to find existing room
    SELECT id INTO v_room_id 
    FROM chat_rooms 
    WHERE consultation_id = p_consultation_id AND NOT is_deleted;
    
    -- Create if not exists
    IF NOT FOUND THEN
        INSERT INTO chat_rooms (consultation_id, user_id, lawyer_id)
        VALUES (p_consultation_id, p_user_id, p_lawyer_id)
        RETURNING id INTO v_room_id;
    END IF;
    
    RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE chat_rooms IS 'Chat rooms between users and lawyers, linked to consultations';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat rooms';
COMMENT ON TABLE chat_attachments IS 'File attachments for chat messages';
COMMENT ON TABLE chat_read_receipts IS 'Tracks last read message per user per room';
COMMENT ON TABLE chat_presence IS 'Real-time presence and typing indicators';

COMMENT ON COLUMN chat_rooms.user_unread_count IS 'Denormalized count of unread messages for the user';
COMMENT ON COLUMN chat_rooms.lawyer_unread_count IS 'Denormalized count of unread messages for the lawyer';
COMMENT ON COLUMN chat_messages.status IS 'Message delivery status: sent -> delivered -> read';
COMMENT ON COLUMN chat_attachments.is_scanned IS 'Indicates if file has been scanned for viruses';
