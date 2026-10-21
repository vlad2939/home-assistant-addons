-- Gustos 2.1 – lista de cumpărături simplificată: produse cu o cantitate liberă („2 kg”, „1 pachet”),
-- fără raioane, bife sau calcule. Produsele nebifate din lista veche se păstrează (doar denumirea).

CREATE TABLE shopping_list (
    id               INTEGER PRIMARY KEY,
    name             TEXT NOT NULL,
    name_normalized  TEXT NOT NULL,
    amount           TEXT,                 -- scris de utilizator, opțional
    position         INTEGER NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
);
CREATE INDEX idx_shopping_list_name ON shopping_list(name_normalized);

INSERT INTO shopping_list (name, name_normalized, position)
SELECT name, name_normalized, ROW_NUMBER() OVER (ORDER BY position, id)
FROM shopping_items
WHERE checked = 0 AND id IN (SELECT MIN(id) FROM shopping_items GROUP BY name_normalized);

DROP TABLE shopping_items;
