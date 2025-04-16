ATTACH TABLE _ UUID '49fd259b-926a-498e-8738-ed4ca668b2bf'
(
    `supplier_id` String,
    `from_airport` String,
    `to_airport` String,
    `journey_type` String
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
