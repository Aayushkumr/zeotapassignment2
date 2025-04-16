ATTACH TABLE _ UUID '59d8cdcd-ae94-4c8f-9821-48e643972d21'
(
    `_User_name` String,
    `Password` String,
    `Console_sign_in_URL` String
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192
