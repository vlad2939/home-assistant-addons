-- Gustos 2 – lista de cumpărături (o singură listă comună, sincronizată pe toate dispozitivele)

CREATE TABLE shopping_items (
    id               INTEGER PRIMARY KEY,
    name             TEXT NOT NULL,
    name_normalized  TEXT NOT NULL,
    quantity         REAL,                 -- g / ml după adunare; altfel unitatea rețetei
    quantity_text    TEXT,                 -- „un praf”, „2-3”
    unit             TEXT,
    note             TEXT,
    aisle            TEXT NOT NULL,        -- raionul din magazin (vezi services/shopping.py)
    sources          TEXT,                 -- rețetele din care vine („Sarmale, Ciorbă de perișoare”)
    checked          INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
    position         INTEGER NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
);
CREATE INDEX idx_shopping_name ON shopping_items(name_normalized);
