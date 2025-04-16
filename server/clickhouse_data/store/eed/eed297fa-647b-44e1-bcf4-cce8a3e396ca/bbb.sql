ATTACH TABLE _ UUID '4bf0c2f9-1989-43ce-a434-aa05a368a4d6'
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
