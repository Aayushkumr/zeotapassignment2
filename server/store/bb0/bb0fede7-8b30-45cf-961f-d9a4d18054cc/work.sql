ATTACH TABLE _ UUID '314a275e-4b00-41fd-8f82-1604993517d0'
(
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
    `Coupon_USed` String,
    `cancellation_rate` String,
    `failure_rate` String,
    `buyer_id` String
)
ENGINE = MergeTree
ORDER BY supplier_id
SETTINGS index_granularity = 8192
