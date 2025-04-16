ATTACH TABLE _ UUID 'a38f3b72-254c-48a9-b958-d0a68446f76a'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
