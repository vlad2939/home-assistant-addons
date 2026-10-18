-- Gustos – schema inițială (v1)

CREATE TABLE categories (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recipes (
    id                    INTEGER PRIMARY KEY,
    title                 TEXT NOT NULL,
    description           TEXT,
    servings              INTEGER,
    prep_time             INTEGER,             -- minute
    cook_time             INTEGER,             -- minute
    difficulty            TEXT CHECK (difficulty IN ('ușoară', 'medie', 'dificilă')),
    category_id           INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    tips                  TEXT,
    notes                 TEXT,
    source_url            TEXT,
    source_site           TEXT NOT NULL DEFAULT 'manual',
    original_language     TEXT,
    photo                 TEXT,                -- nume fișier în photos/
    favorite              INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
    calories_per_serving  REAL,                -- nefolosit în v1
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
);
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_source_url ON recipes(source_url);
CREATE INDEX idx_recipes_source_site ON recipes(source_site);

CREATE TABLE tags (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE recipe_tags (
    recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);

CREATE TABLE recipe_ingredients (
    id               INTEGER PRIMARY KEY,
    recipe_id        INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    group_name       TEXT,                     -- ex. „Pentru sos”
    position         INTEGER NOT NULL,
    quantity         REAL,                     -- se scalează cu porțiile
    quantity_text    TEXT,                     -- „2-3”, „un praf” (nu se scalează)
    unit             TEXT,
    name             TEXT NOT NULL,
    name_normalized  TEXT NOT NULL,            -- fără diacritice, litere mici
    note             TEXT
);
CREATE INDEX idx_ingredients_recipe ON recipe_ingredients(recipe_id, position);
CREATE INDEX idx_ingredients_name ON recipe_ingredients(name_normalized);

CREATE TABLE recipe_steps (
    id         INTEGER PRIMARY KEY,
    recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    text       TEXT NOT NULL
);
CREATE INDEX idx_steps_recipe ON recipe_steps(recipe_id, position);

-- Căutare full-text; rowid = recipes.id. Actualizată de aplicație la fiecare salvare.
CREATE VIRTUAL TABLE recipes_fts USING fts5(
    title, description, ingredients, tags,
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE import_sites (
    id      INTEGER PRIMARY KEY,
    domain  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    active  INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

-- Date de bază

INSERT INTO categories (name, position) VALUES
    ('Supe și ciorbe', 1),
    ('Fel principal', 2),
    ('Garnituri', 3),
    ('Salate', 4),
    ('Aperitive', 5),
    ('Deserturi', 6),
    ('Panificație și patiserie', 7),
    ('Sosuri', 8),
    ('Conserve și murături', 9),
    ('Mic dejun', 10),
    ('Băuturi', 11);

INSERT INTO import_sites (domain) VALUES
    ('savoriurbane.com'),
    ('jamilacuisine.ro'),
    ('retetelemihaelei.com'),
    ('teoskitchen.ro'),
    ('adihadean.ro'),
    ('lauraadamache.ro'),
    ('sefpaulconstantin.ro');

INSERT INTO settings (key, value) VALUES
    ('theme', 'auto'),
    ('accent', 'orange');
