DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'timescaledb'
    ) THEN
        RAISE EXCEPTION 'TimescaleDB extension is required before creating market_quotes';
    END IF;

    table_exists := to_regclass('public.market_quotes') IS NOT NULL;
    IF table_exists THEN
        IF EXISTS (
            SELECT 1
            FROM (
                VALUES
                    ('received_at', 'timestamp with time zone', 'NO'),
                    ('exchange_event_time', 'timestamp with time zone', 'YES'),
                    ('asset', 'text', 'NO'),
                    ('bid_price', 'bigint', 'NO'),
                    ('ask_price', 'bigint', 'NO'),
                    ('bid_quantity', 'bigint', 'NO'),
                    ('ask_quantity', 'bigint', 'NO'),
                    ('update_id', 'bigint', 'NO')
            ) AS expected(column_name, data_type, is_nullable)
            LEFT JOIN information_schema.columns AS actual
                ON actual.table_schema = 'public'
               AND actual.table_name = 'market_quotes'
               AND actual.column_name = expected.column_name
            WHERE actual.column_name IS NULL
               OR actual.data_type <> expected.data_type
               OR actual.is_nullable <> expected.is_nullable
        ) THEN
            RAISE EXCEPTION 'Existing public.market_quotes has an incompatible schema; inspect it before migration';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint AS constraint_info
            JOIN LATERAL unnest(constraint_info.conkey) AS key_column(attnum)
                ON TRUE
            JOIN pg_attribute AS column_info
                ON column_info.attrelid = constraint_info.conrelid
               AND column_info.attnum = key_column.attnum
            WHERE constraint_info.conrelid = 'public.market_quotes'::regclass
              AND constraint_info.contype = 'p'
            GROUP BY constraint_info.oid
            HAVING COUNT(*) = 3
               AND COUNT(*) FILTER (
                   WHERE column_info.attname IN ('asset', 'received_at', 'update_id')
               ) = 3
        ) THEN
            RAISE EXCEPTION 'Existing public.market_quotes primary key must be (asset, received_at, update_id)';
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.market_quotes (
    received_at TIMESTAMPTZ NOT NULL,
    exchange_event_time TIMESTAMPTZ NULL,
    asset TEXT NOT NULL,
    bid_price BIGINT NOT NULL,
    ask_price BIGINT NOT NULL,
    bid_quantity BIGINT NOT NULL,
    ask_quantity BIGINT NOT NULL,
    update_id BIGINT NOT NULL,
    PRIMARY KEY (asset, received_at, update_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
          AND hypertable_name = 'market_quotes'
    ) THEN
        PERFORM create_hypertable(
            'public.market_quotes',
            'received_at',
            if_not_exists => TRUE,
            migrate_data => TRUE
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_market_quotes_asset_received
    ON public.market_quotes (asset, received_at DESC);
