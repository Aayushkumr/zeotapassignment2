ATTACH TABLE _ UUID '02724dca-c337-4280-8110-dd689fcfa930'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
