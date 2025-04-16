ATTACH TABLE _ UUID 'ad994922-dfb5-4160-94fb-1412691904da'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
