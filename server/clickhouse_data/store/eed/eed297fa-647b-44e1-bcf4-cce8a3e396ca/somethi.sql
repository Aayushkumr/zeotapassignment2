ATTACH TABLE _ UUID '24c1527f-7415-487a-81f2-af96f311e62f'
(
    `supplier_id` String,
    `from_airport` String,
    `to_airport` String,
    `journey_type` String
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
