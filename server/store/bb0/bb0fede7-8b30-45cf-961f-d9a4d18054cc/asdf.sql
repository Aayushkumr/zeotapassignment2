ATTACH TABLE _ UUID 'ac8f9ad3-9547-4528-bc1b-17ae2eb33223'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
