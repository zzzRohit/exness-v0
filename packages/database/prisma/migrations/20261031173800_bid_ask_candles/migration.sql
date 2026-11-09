DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'timescaledb'
    ) THEN
        RAISE EXCEPTION 'TimescaleDB extension is required before creating market_candles';
    END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.market_quotes_ingest_id_seq AS BIGINT;

ALTER TABLE public.market_quotes
    ADD COLUMN IF NOT EXISTS ingest_id BIGINT;

ALTER TABLE public.market_quotes
    ALTER COLUMN ingest_id
    SET DEFAULT nextval('public.market_quotes_ingest_id_seq'::regclass);

ALTER SEQUENCE public.market_quotes_ingest_id_seq
    OWNED BY public.market_quotes.ingest_id;

DO $$
DECLARE
    highest_ingest_id BIGINT;
    sequence_last_value BIGINT;
    sequence_is_called BOOLEAN;
BEGIN
    SELECT COALESCE(MAX(ingest_id), 0)
    INTO highest_ingest_id
    FROM public.market_quotes;

    SELECT last_value, is_called
    INTO sequence_last_value, sequence_is_called
    FROM public.market_quotes_ingest_id_seq;

    IF sequence_is_called OR highest_ingest_id > 0 THEN
        PERFORM setval(
            'public.market_quotes_ingest_id_seq'::regclass,
            GREATEST(highest_ingest_id, sequence_last_value),
            TRUE
        );
    END IF;
END $$;

UPDATE public.market_quotes
SET ingest_id = nextval('public.market_quotes_ingest_id_seq'::regclass)
WHERE ingest_id IS NULL;

ALTER TABLE public.market_quotes
    ALTER COLUMN ingest_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_market_quotes_ingest_id
    ON public.market_quotes (ingest_id);

CREATE TABLE IF NOT EXISTS public.market_candles (
    asset TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    bid_open BIGINT NOT NULL,
    bid_high BIGINT NOT NULL,
    bid_low BIGINT NOT NULL,
    bid_close BIGINT NOT NULL,
    ask_open BIGINT NOT NULL,
    ask_high BIGINT NOT NULL,
    ask_low BIGINT NOT NULL,
    ask_close BIGINT NOT NULL,
    quote_count BIGINT NOT NULL,
    first_received_at TIMESTAMPTZ NOT NULL,
    first_update_id BIGINT NOT NULL,
    last_received_at TIMESTAMPTZ NOT NULL,
    last_update_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset, "interval", start_time)
);

CREATE INDEX IF NOT EXISTS idx_market_candles_interval_start
    ON public.market_candles ("interval", start_time DESC);

CREATE TABLE IF NOT EXISTS public.candle_aggregation_checkpoint (
    consumer_name TEXT PRIMARY KEY,
    last_ingest_id BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
          AND hypertable_name = 'market_candles'
    ) THEN
        PERFORM create_hypertable(
            'public.market_candles',
            'start_time',
            if_not_exists => TRUE,
            migrate_data => TRUE
        );
    END IF;
END $$;
