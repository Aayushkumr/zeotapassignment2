ATTACH TABLE _ UUID '97d338cf-9aa6-4522-93b4-647cbed43997'
(
    `objectObject` Nullable(String)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
