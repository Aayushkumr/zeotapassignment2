ATTACH TABLE _ UUID 'cef01ddd-5838-4cad-b1db-ef5a30d7f37f'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
