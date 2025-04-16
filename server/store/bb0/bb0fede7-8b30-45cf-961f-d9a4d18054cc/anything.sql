ATTACH TABLE _ UUID 'ad897169-3bda-4a4d-827b-969eb8ba0b39'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
