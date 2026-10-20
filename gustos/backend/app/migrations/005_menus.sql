-- Gustos 2 – meniuri: săptămânale (zile × mese) și evenimente (Crăciun, zi de naștere …, pe feluri)

CREATE TABLE menus (
    id          INTEGER PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('week', 'event')),
    title       TEXT,                          -- obligatoriu la evenimente
    start_date  TEXT NOT NULL,                 -- săptămână: lunea (AAAA-LL-ZZ); eveniment: data
    guests      INTEGER NOT NULL DEFAULT 2,    -- câte persoane (porțiile implicite)
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
);
CREATE UNIQUE INDEX idx_menus_week ON menus(start_date) WHERE kind = 'week';  -- un meniu pe săptămână
CREATE INDEX idx_menus_date ON menus(kind, start_date);

CREATE TABLE menu_items (
    id         INTEGER PRIMARY KEY,
    menu_id    INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    day        INTEGER CHECK (day BETWEEN 0 AND 6),   -- 0 = luni; NULL la evenimente
    slot       TEXT NOT NULL,                          -- masa (săptămână) sau felul (eveniment)
    servings   INTEGER NOT NULL CHECK (servings BETWEEN 1 AND 200),
    position   INTEGER NOT NULL
);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id, position);
CREATE INDEX idx_menu_items_recipe ON menu_items(recipe_id);
