ATTACH TABLE _ UUID '00ed6b30-e930-44ad-b054-65beff4c3d0a'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
