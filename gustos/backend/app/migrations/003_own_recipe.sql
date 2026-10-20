-- Gustos 1.2 – marcajul „Rețeta mea” (rețete proprii, nu preluate de pe un site)

ALTER TABLE recipes ADD COLUMN own INTEGER NOT NULL DEFAULT 0 CHECK (own IN (0, 1));
CREATE INDEX idx_recipes_own ON recipes(own);
