ATTACH TABLE _ UUID 'f23d02d3-e512-4332-abb8-9fbc4ff36fb0'
(
    `supplier_id` String,
    `from_airport` String,
    `to_airport` String,
    `journey_type` String
)
ENGINE = MergeTree
ORDER BY supplier_id
SETTINGS index_granularity = 8192
