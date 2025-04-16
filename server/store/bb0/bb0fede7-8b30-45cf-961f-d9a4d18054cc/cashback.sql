ATTACH TABLE _ UUID '6f21b9c7-a59e-4abe-80c3-625d99edd5ad'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
