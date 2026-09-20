-- AgriExpert Pro — PostgreSQL 16 + PostGIS
-- Schéma de référence de l'Étape 1.
-- Les migrations Laravel devront reprendre ces contraintes et index.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE app_role AS ENUM ('producer', 'expert', 'institution', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended', 'deleted');
CREATE TYPE language_code AS ENUM ('fr', 'mo');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE expert_category AS ENUM ('agriculture', 'livestock', 'aquaculture', 'apiculture');
CREATE TYPE availability_status AS ENUM ('offline', 'available', 'busy', 'on_call');
CREATE TYPE media_kind AS ENUM ('image', 'audio', 'video', 'document');
CREATE TYPE media_visibility AS ENUM ('private', 'authenticated', 'public');
CREATE TYPE transcription_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE question_status AS ENUM ('open', 'in_progress', 'answered', 'closed', 'archived');
CREATE TYPE answer_status AS ENUM ('draft', 'published', 'hidden');
CREATE TYPE emergency_type AS ENUM ('veterinary', 'phytosanitary', 'livestock_epidemic', 'pest_attack', 'water_quality', 'other');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE emergency_status AS ENUM ('reported', 'triaged', 'assigned', 'in_progress', 'resolved', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('proposed', 'accepted', 'declined', 'active', 'completed', 'cancelled');
CREATE TYPE reaction_type AS ENUM ('helpful', 'not_helpful');
CREATE TYPE notification_type AS ENUM ('question_answer', 'emergency', 'assignment', 'system', 'reminder');
CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'sms', 'email');
CREATE TYPE guide_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE task_status AS ENUM ('planned', 'due', 'completed', 'skipped');
CREATE TYPE treatment_target AS ENUM ('crop', 'livestock', 'aquaculture', 'apiculture');
CREATE TYPE alert_type AS ENUM ('sanitary', 'phytosanitary', 'climate', 'market', 'water');
CREATE TYPE severity_level AS ENUM ('info', 'warning', 'danger', 'critical');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    phone VARCHAR(32) UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    preferred_language language_code NOT NULL DEFAULT 'fr',
    status user_status NOT NULL DEFAULT 'pending',
    avatar_media_id UUID,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE institution_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_name VARCHAR(200) NOT NULL,
    institution_type VARCHAR(100),
    administrative_level VARCHAR(100),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kind media_kind NOT NULL,
    visibility media_visibility NOT NULL DEFAULT 'private',
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'r2',
    object_key TEXT NOT NULL UNIQUE,
    original_filename TEXT,
    mime_type VARCHAR(150) NOT NULL,
    byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
    duration_seconds NUMERIC(10, 2) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    checksum_sha256 CHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE media_transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    language language_code NOT NULL,
    status transcription_status NOT NULL DEFAULT 'queued',
    provider VARCHAR(50),
    transcript TEXT,
    confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (media_id, language)
);

ALTER TABLE users
    ADD CONSTRAINT users_avatar_media_fk
    FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE administrative_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES administrative_areas(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 0 AND 3),
    code VARCHAR(50),
    boundary geometry(MultiPolygon, 4326),
    center geography(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_id, name)
);

CREATE TABLE producer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    producer_type VARCHAR(50),
    preferred_contact_channel notification_channel NOT NULL DEFAULT 'in_app',
    literacy_support_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expert_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    organization_name VARCHAR(200),
    bio TEXT,
    years_experience SMALLINT CHECK (years_experience IS NULL OR years_experience >= 0),
    verification_status verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    availability availability_status NOT NULL DEFAULT 'offline',
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating_average BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expert_specialties (
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
    category expert_category NOT NULL,
    specialty_name VARCHAR(150) NOT NULL DEFAULT 'general',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (expert_id, category, specialty_name)
);

CREATE TABLE expert_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    document_type VARCHAR(100) NOT NULL,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expert_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
    label VARCHAR(100),
    point geography(Point, 4326) NOT NULL,
    service_radius_km NUMERIC(8, 2) NOT NULL DEFAULT 50 CHECK (service_radius_km > 0),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expert_availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Ouagadougou',
    CHECK (ends_at > starts_at)
);

CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    administrative_area_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    primary_category expert_category,
    location geography(Point, 4326) NOT NULL,
    boundary geometry(MultiPolygon, 4326),
    area_hectares NUMERIC(12, 3) CHECK (area_hectares IS NULL OR area_hectares >= 0),
    elevation_m NUMERIC(8, 2),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE farm_members (
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (farm_id, user_id)
);

CREATE TABLE herds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    head_count INTEGER NOT NULL DEFAULT 0 CHECK (head_count >= 0),
    health_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    category expert_category NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    status question_status NOT NULL DEFAULT 'open',
    language language_code NOT NULL DEFAULT 'fr',
    location geography(Point, 4326),
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    accepted_answer_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    CHECK (length(trim(coalesce(body, ''))) > 0 OR title <> '')
);

CREATE TABLE question_media (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (question_id, media_id)
);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    language language_code NOT NULL DEFAULT 'fr',
    status answer_status NOT NULL DEFAULT 'published',
    is_certified BOOLEAN NOT NULL DEFAULT false,
    helpful_count INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE questions
    ADD CONSTRAINT questions_accepted_answer_fk
    FOREIGN KEY (accepted_answer_id) REFERENCES answers(id) ON DELETE SET NULL;

CREATE TABLE answer_media (
    answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (answer_id, media_id)
);

CREATE TABLE question_reactions (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (question_id, user_id)
);

CREATE TABLE answer_reactions (
    answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE emergency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    category expert_category,
    emergency_type emergency_type NOT NULL,
    priority priority_level NOT NULL DEFAULT 'high',
    status emergency_status NOT NULL DEFAULT 'reported',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location geography(Point, 4326) NOT NULL,
    administrative_area_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
    affected_count INTEGER CHECK (affected_count IS NULL OR affected_count >= 0),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    triaged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    CHECK (resolved_at IS NULL OR resolved_at >= reported_at)
);

CREATE TABLE emergency_media (
    emergency_id UUID NOT NULL REFERENCES emergency_reports(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (emergency_id, media_id)
);

CREATE TABLE emergency_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id UUID NOT NULL REFERENCES emergency_reports(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE RESTRICT,
    status assignment_status NOT NULL DEFAULT 'proposed',
    distance_km NUMERIC(10, 3),
    priority_rank SMALLINT CHECK (priority_rank IS NULL OR priority_rank > 0),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE (emergency_id, expert_id)
);

CREATE TABLE expert_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    emergency_id UUID REFERENCES emergency_reports(id) ON DELETE SET NULL,
    score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (question_id IS NOT NULL OR emergency_id IS NOT NULL)
);

CREATE TABLE technical_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category expert_category NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    language language_code NOT NULL DEFAULT 'fr',
    status guide_status NOT NULL DEFAULT 'draft',
    reading_time_minutes SMALLINT CHECK (reading_time_minutes IS NULL OR reading_time_minutes > 0),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guide_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES technical_guides(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL CHECK (step_number > 0),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    duration_days SMALLINT CHECK (duration_days IS NULL OR duration_days > 0),
    UNIQUE (guide_id, step_number)
);

CREATE TABLE guide_media (
    guide_id UUID NOT NULL REFERENCES technical_guides(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (guide_id, media_id)
);

CREATE TABLE itinerary_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    guide_id UUID REFERENCES technical_guides(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    crop_or_activity VARCHAR(150) NOT NULL,
    season VARCHAR(100),
    starts_on DATE,
    ends_on DATE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE itinerary_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES itinerary_plans(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL,
    due_on DATE NOT NULL,
    status task_status NOT NULL DEFAULT 'planned',
    dosage NUMERIC(12, 3),
    dosage_unit VARCHAR(50),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE treatment_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category expert_category NOT NULL,
    target treatment_target NOT NULL,
    name VARCHAR(200) NOT NULL,
    condition_name VARCHAR(200) NOT NULL,
    warnings TEXT,
    language language_code NOT NULL DEFAULT 'fr',
    status guide_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE treatment_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES treatment_protocols(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL CHECK (step_number > 0),
    product_name VARCHAR(200),
    active_ingredient VARCHAR(200),
    dosage NUMERIC(12, 4),
    dosage_unit VARCHAR(50),
    route VARCHAR(100),
    frequency VARCHAR(100),
    duration_days SMALLINT CHECK (duration_days IS NULL OR duration_days > 0),
    notes TEXT,
    UNIQUE (protocol_id, step_number)
);

CREATE TABLE institutional_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL,
    severity severity_level NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    affected_area geometry(MultiPolygon, 4326),
    center geography(Point, 4326),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    source_reference VARCHAR(200),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL DEFAULT 'in_app',
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX administrative_areas_boundary_gist ON administrative_areas USING GIST (boundary);
CREATE INDEX administrative_areas_center_gist ON administrative_areas USING GIST (center);
CREATE INDEX expert_locations_point_gist ON expert_locations USING GIST (point);
CREATE INDEX expert_locations_expert_idx ON expert_locations (expert_id, is_primary);
CREATE INDEX farms_location_gist ON farms USING GIST (location);
CREATE INDEX farms_boundary_gist ON farms USING GIST (boundary);
CREATE INDEX farms_owner_idx ON farms (owner_user_id, archived_at);
CREATE INDEX questions_feed_idx ON questions (category, status, created_at DESC);
CREATE INDEX questions_location_gist ON questions USING GIST (location);
CREATE INDEX answers_question_idx ON answers (question_id, status, created_at);
CREATE INDEX emergency_queue_idx ON emergency_reports (status, priority, reported_at DESC);
CREATE INDEX emergency_location_gist ON emergency_reports USING GIST (location);
CREATE INDEX emergency_area_idx ON emergency_reports (administrative_area_id, reported_at DESC);
CREATE INDEX emergency_assignments_expert_idx ON emergency_assignments (expert_id, status);
CREATE INDEX expert_directory_idx ON expert_profiles (verification_status, availability, rating_average DESC);
CREATE INDEX guide_directory_idx ON technical_guides (category, status, published_at DESC);
CREATE INDEX itinerary_due_idx ON itinerary_tasks (status, due_on);
CREATE INDEX alerts_area_gist ON institutional_alerts USING GIST (affected_area);
CREATE INDEX alerts_center_gist ON institutional_alerts USING GIST (center);
CREATE INDEX notifications_user_idx ON notifications (user_id, read_at, created_at DESC);
CREATE INDEX audit_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE VIEW vw_institutional_daily_metrics AS
SELECT
    date_trunc('day', q.created_at)::date AS metric_date,
    count(*) AS questions_total,
    count(*) FILTER (WHERE q.status IN ('answered', 'closed')) AS questions_resolved,
    round(avg(EXTRACT(EPOCH FROM (a.first_answer_at - q.created_at)) / 60.0)::numeric, 2) AS avg_first_answer_minutes
FROM questions q
LEFT JOIN (
    SELECT question_id, min(created_at) AS first_answer_at
    FROM answers
    WHERE status = 'published'
    GROUP BY question_id
) a ON a.question_id = q.id
GROUP BY date_trunc('day', q.created_at)::date;

CREATE VIEW vw_open_emergency_summary AS
SELECT
    er.administrative_area_id,
    er.emergency_type,
    er.priority,
    count(*) AS open_count,
    min(er.reported_at) AS oldest_reported_at
FROM emergency_reports er
WHERE er.status IN ('reported', 'triaged', 'assigned', 'in_progress')
GROUP BY er.administrative_area_id, er.emergency_type, er.priority;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER farms_set_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER answers_set_updated_at BEFORE UPDATE ON answers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER expert_profiles_set_updated_at BEFORE UPDATE ON expert_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER technical_guides_set_updated_at BEFORE UPDATE ON technical_guides
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER treatment_protocols_set_updated_at BEFORE UPDATE ON treatment_protocols
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
