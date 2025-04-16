ATTACH TABLE _ UUID '1d6a606e-ad21-4008-a483-8e538b505722'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
