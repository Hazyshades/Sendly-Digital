-- Миграция недостающих записей из gift_cards в leaderboard_stats
-- Этот скрипт добавляет записи для отправителей, которые есть в gift_cards,
-- но отсутствуют в leaderboard_stats, или обновляет существующие записи

INSERT INTO leaderboard_stats (
  user_identifier,
  sender_address,
  social_platform,
  cards_sent_total,
  amount_sent_total,
  amount_sent_by_currency,
  last_sent_at,
  last_recipient,
  display_name,
  avatar_url,
  created_at,
  updated_at
)
WITH card_events AS (
  SELECT
    LOWER(TRIM(sender_address)) AS sender_address,
    amount::numeric AS amount,
    currency,
    recipient_username,
    created_at
  FROM gift_cards
  WHERE sender_address IS NOT NULL 
    AND TRIM(sender_address) != ''
    AND LENGTH(TRIM(sender_address)) >= 10
),
currency_totals AS (
  SELECT
    sender_address,
    jsonb_object_agg(currency, currency_sum) AS amount_sent_by_currency
  FROM (
    SELECT
      sender_address,
      currency,
      SUM(amount::numeric) AS currency_sum
    FROM card_events
    GROUP BY sender_address, currency
  ) t
  GROUP BY sender_address
),
last_activity AS (
  SELECT DISTINCT ON (sender_address)
    sender_address,
    recipient_username AS last_recipient,
    created_at AS last_sent_at
  FROM card_events
  ORDER BY sender_address, created_at DESC
),
aggregated AS (
  SELECT
    sender_address,
    COUNT(*) AS cards_sent_total,
    SUM(amount) AS amount_sent_total
  FROM card_events
  GROUP BY sender_address
),
new_stats AS (
  SELECT
    a.sender_address AS user_identifier,
    a.sender_address,
    'address' AS social_platform,
    a.cards_sent_total,
    a.amount_sent_total,
    COALESCE(ct.amount_sent_by_currency, '{}'::jsonb) AS amount_sent_by_currency,
    la.last_sent_at,
    la.last_recipient,
    NULL::text AS display_name,
    NULL::text AS avatar_url,
    (SELECT MIN(created_at) FROM card_events WHERE sender_address = a.sender_address) AS first_created_at,
    NOW() AS updated_at
  FROM aggregated a
  LEFT JOIN currency_totals ct ON ct.sender_address = a.sender_address
  LEFT JOIN last_activity la ON la.sender_address = a.sender_address
)
SELECT
  user_identifier,
  sender_address,
  social_platform,
  cards_sent_total,
  amount_sent_total,
  amount_sent_by_currency,
  last_sent_at,
  last_recipient,
  display_name,
  avatar_url,
  first_created_at AS created_at,
  updated_at
FROM new_stats
ON CONFLICT (user_identifier, sender_address, social_platform) 
DO UPDATE SET
  cards_sent_total = EXCLUDED.cards_sent_total,
  amount_sent_total = EXCLUDED.amount_sent_total,
  amount_sent_by_currency = EXCLUDED.amount_sent_by_currency,
  last_sent_at = EXCLUDED.last_sent_at,
  last_recipient = EXCLUDED.last_recipient,
  updated_at = EXCLUDED.updated_at,
  -- Сохраняем существующие display_name и avatar_url, если они есть
  display_name = COALESCE(leaderboard_stats.display_name, EXCLUDED.display_name),
  avatar_url = COALESCE(leaderboard_stats.avatar_url, EXCLUDED.avatar_url);

-- Выводим статистику миграции
DO $$
DECLARE
  total_cards INTEGER;
  unique_senders INTEGER;
  stats_count INTEGER;
  invalid_addresses INTEGER;
BEGIN
  -- Общее количество карт
  SELECT COUNT(*) INTO total_cards FROM gift_cards;
  
  -- Уникальные отправители с валидными адресами
  SELECT COUNT(DISTINCT LOWER(TRIM(sender_address))) INTO unique_senders
  FROM gift_cards
  WHERE sender_address IS NOT NULL 
    AND TRIM(sender_address) != ''
    AND LENGTH(TRIM(sender_address)) >= 10;
  
  -- Количество записей в leaderboard_stats
  SELECT COUNT(*) INTO stats_count FROM leaderboard_stats;
  
  -- Карты с невалидными адресами
  SELECT COUNT(*) INTO invalid_addresses
  FROM gift_cards
  WHERE sender_address IS NULL 
    OR TRIM(sender_address) = ''
    OR LENGTH(TRIM(sender_address)) < 10;
  
  RAISE NOTICE '=== Статистика миграции ===';
  RAISE NOTICE 'Всего карт в gift_cards: %', total_cards;
  RAISE NOTICE 'Уникальных отправителей (валидные адреса): %', unique_senders;
  RAISE NOTICE 'Записей в leaderboard_stats: %', stats_count;
  RAISE NOTICE 'Карт с невалидными адресами (исключены): %', invalid_addresses;
  RAISE NOTICE '================================';
END $$;

