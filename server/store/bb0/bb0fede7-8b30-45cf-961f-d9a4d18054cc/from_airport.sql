ATTACH TABLE _ UUID 'd91a9254-5222-425a-bb2a-49a2d4a4996d'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
