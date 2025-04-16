ATTACH TABLE _ UUID 'd69d3a27-c5cc-479a-a0b0-1aba2c68fd77'
(
    `buyer_id` String,
    `supplier_id` String,
    `to_airport` String,
    `from_airport` String,
    `journey_type` String,
    `pax` String,
    `costprice` String,
    `markup` String,
    `selling_price` String,
    `booking_date` String,
    `payment_method` String,
    `refund_status` String,
    `refund_amount` String,
    `channel_of_booking` String,
    `booking_status` String,
    `travel_date` String,
    `cashback` String,
    `coupon_redeem` String,
    `Coupon_USed_` String,
    `cancellation_rate` String,
    `failure_rate` String
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
