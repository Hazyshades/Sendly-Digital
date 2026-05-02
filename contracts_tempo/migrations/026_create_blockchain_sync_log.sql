-- Таблица для логирования синхронизации событий блокчейна
-- НЕ влияет на существующие таблицы, используется отдельно для отслеживания

CREATE TABLE IF NOT EXISTS blockchain_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'GiftCardCreated', 'GiftCardCreatedForTwitter', etc.
  sender_address TEXT NOT NULL,
  recipient_address TEXT,
  recipient_username TEXT,
  recipient_type TEXT, -- 'address', 'twitter', 'twitch', 'telegram', 'tiktok', 'instagram'
  amount TEXT NOT NULL,
  currency TEXT NOT NULL, -- 'USDC', 'EURC'
  message TEXT DEFAULT '',
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  log_index INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Дополнительные данные из события
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_token_id ON blockchain_sync_log(token_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_tx_hash ON blockchain_sync_log(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_sender ON blockchain_sync_log(sender_address);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_block_number ON blockchain_sync_log(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_recipient_type ON blockchain_sync_log(recipient_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_synced_at ON blockchain_sync_log(synced_at DESC);

-- Уникальный индекс для событий с log_index (основной случай)
CREATE UNIQUE INDEX IF NOT EXISTS idx_blockchain_sync_log_unique_event 
  ON blockchain_sync_log(tx_hash, log_index) 
  WHERE log_index IS NOT NULL;

-- Дополнительный индекс для поиска по tx_hash (для событий без log_index)
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_tx_hash_log_index 
  ON blockchain_sync_log(tx_hash, log_index);

-- Индекс для комбинированного поиска
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_log_sender_token 
  ON blockchain_sync_log(sender_address, token_id);

-- Комментарии
COMMENT ON TABLE blockchain_sync_log IS 'Лог синхронизации событий создания gift карт из блокчейна. Отдельная таблица, не влияет на существующие gift_cards и leaderboard_stats';
COMMENT ON COLUMN blockchain_sync_log.token_id IS 'ID карты из события';
COMMENT ON COLUMN blockchain_sync_log.event_type IS 'Тип события (GiftCardCreated, GiftCardCreatedForTwitter, etc.)';
COMMENT ON COLUMN blockchain_sync_log.synced_at IS 'Время, когда событие было синхронизировано в БД';

-- Включаем RLS для безопасности
ALTER TABLE blockchain_sync_log ENABLE ROW LEVEL SECURITY;

-- Разрешаем всем читать (публичные данные блокчейна)
CREATE POLICY "Anyone can read blockchain sync log" ON blockchain_sync_log
  FOR SELECT
  USING (true);

-- Разрешаем вставку через service role (для Edge Functions)
-- Это будет использоваться через SERVICE_ROLE_KEY
COMMENT ON POLICY "Anyone can read blockchain sync log" ON blockchain_sync_log IS 'Разрешает чтение логов синхронизации всем пользователям';

