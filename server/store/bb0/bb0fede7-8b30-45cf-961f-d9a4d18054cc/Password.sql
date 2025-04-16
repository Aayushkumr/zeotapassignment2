ATTACH TABLE _ UUID '91c9de03-1724-4431-b438-4f523fa05310'
(
    `object_Object` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
