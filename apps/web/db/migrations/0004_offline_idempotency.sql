ALTER TABLE questions ADD COLUMN client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS questions_author_client_request_index ON questions(author_user_id, client_request_id) WHERE client_request_id IS NOT NULL;

ALTER TABLE media_assets ADD COLUMN client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_owner_client_request_index ON media_assets(owner_user_id, client_request_id) WHERE client_request_id IS NOT NULL;
