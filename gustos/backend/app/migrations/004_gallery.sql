-- Gustos 2 – galerie foto: poze în plus față de poza principală (recipes.photo)

CREATE TABLE recipe_photos (
    id          INTEGER PRIMARY KEY,
    recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    photo       TEXT NOT NULL,              -- nume fișier în photos/ (ca recipes.photo)
    position    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
);
CREATE INDEX idx_recipe_photos_recipe ON recipe_photos(recipe_id, position);
