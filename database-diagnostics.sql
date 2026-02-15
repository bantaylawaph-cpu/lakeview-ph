-- Database Performance Diagnostics Script
-- Run this on Supabase SQL Editor to diagnose connection/lock/performance issues
-- Generated: 2026-02-14

-- ==============================================
-- 1. CONNECTION POOL STATUS
-- ==============================================
-- Shows current database connections, states, and waiting queries
SELECT 
    count(*) as total_connections,
    count(*) filter (where state = 'active') as active,
    count(*) filter (where state = 'idle') as idle,
    count(*) filter (where state = 'idle in transaction') as idle_in_transaction,
    count(*) filter (where wait_event_type is not null) as waiting,
    max(extract(epoch from (now() - query_start))) as longest_active_query_seconds
FROM pg_stat_activity 
WHERE datname = current_database()
  AND pid != pg_backend_pid()
  AND usename NOT LIKE 'supabase%';

-- ==============================================
-- 2. ACTIVE QUERIES (Slow or Long-Running)
-- ==============================================
-- Shows queries running longer than 1 second
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    wait_event_type,
    wait_event,
    left(query, 200) as query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'active'
  AND query_start < now() - interval '1 second'
  AND pid != pg_backend_pid()
  AND usename NOT LIKE 'supabase%'
ORDER BY query_start;

-- ==============================================
-- 3. BLOCKING QUERIES (Lock Contention)
-- ==============================================
-- Shows which queries are blocking others
SELECT 
    blocked.pid AS blocked_pid,
    blocked.usename AS blocked_user,
    now() - blocked.query_start AS blocked_duration,
    left(blocked.query, 150) AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.usename AS blocking_user,
    now() - blocking.query_start AS blocking_duration,
    left(blocking.query, 150) AS blocking_query,
    blocked.wait_event_type,
    blocked.wait_event
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
ORDER BY blocked.query_start;

-- ==============================================
-- 4. TABLE-LEVEL LOCK SUMMARY
-- ==============================================
-- Shows which tables have the most locks
SELECT 
    schemaname,
    relname as table_name,
    count(*) as lock_count,
    array_agg(DISTINCT mode) as lock_modes
FROM pg_locks l
JOIN pg_stat_user_tables t ON l.relation = t.relid
GROUP BY schemaname, relname
HAVING count(*) > 1
ORDER BY lock_count DESC
LIMIT 20;

-- ==============================================
-- 5. SLOW QUERY STATS (personal_access_tokens)
-- ==============================================
-- Check if personal_access_tokens queries are slow
SELECT 
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as mean_ms,
    max_exec_time as max_ms,
    stddev_exec_time as stddev_ms,
    left(query, 200) as query_preview
FROM pg_stat_statements
WHERE query LIKE '%personal_access_tokens%'
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ==============================================
-- 6. SLOW QUERY STATS (sampling_events)
-- ==============================================
-- Check if sampling_events queries are slow
SELECT 
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as mean_ms,
    max_exec_time as max_ms,
    stddev_exec_time as stddev_ms,
    left(query, 200) as query_preview
FROM pg_stat_statements
WHERE query LIKE '%sampling_events%'
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ==============================================
-- 7. INDEX USAGE (sampling_events)
-- ==============================================
-- Verify our new index is being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'sampling_events'
ORDER BY idx_scan DESC;

-- ==============================================
-- 8. TABLE BLOAT (personal_access_tokens)
-- ==============================================
-- Check if table needs VACUUM
SELECT 
    schemaname,
    relname as table_name,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_tup_hot_upd as hot_updates,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    CASE 
        WHEN n_live_tup > 0 
        THEN round(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0 
    END as dead_row_percent
FROM pg_stat_user_tables
WHERE relname IN ('personal_access_tokens', 'sampling_events', 'lakes')
ORDER BY dead_row_percent DESC;

-- ==============================================
-- 9. MISSING INDEXES (Detect Sequential Scans)
-- ==============================================
-- Tables with high sequential scan counts may need indexes
SELECT 
    schemaname,
    relname as table_name,
    seq_scan as sequential_scans,
    seq_tup_read as rows_read_sequentially,
    idx_scan as index_scans,
    n_live_tup as live_rows,
    CASE 
        WHEN seq_scan > 0 AND idx_scan > 0 
        THEN round(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        WHEN seq_scan > 0 THEN 100.0
        ELSE 0
    END as seq_scan_percent
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY seq_scan DESC
LIMIT 20;

-- ==============================================
-- 10. QUERY PLAN FOR /api/options/lakes SLOW QUERY
-- ==============================================
-- Test the actual query that was slow
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT lakes.id, lakes.name, lakes.class_code 
FROM lakes 
WHERE EXISTS (
    SELECT 1 
    FROM sampling_events 
    WHERE sampling_events.lake_id = lakes.id
) 
ORDER BY lakes.name ASC 
LIMIT 500;

-- ==============================================
-- INTERPRETATION GUIDE
-- ==============================================
/*
1. CONNECTION POOL STATUS:
   - waiting > 5: Connection pool saturated, increase pool size or reduce query time
   - idle_in_transaction > 0: Transactions not being committed, check for hung connections
   - longest_active_query_seconds > 10: Slow query or blocking detected

2. BLOCKING QUERIES:
   - Any results here = active lock contention
   - Look for UPDATE on personal_access_tokens blocking SELECT
   - Kill blocking query if needed: SELECT pg_terminate_backend(blocking_pid);

3. TABLE LOCKS:
   - personal_access_tokens with many locks = token update contention (our fix addresses this)
   - sampling_events with many locks = possible bulk import or long transaction

4. SLOW QUERY STATS:
   - mean_ms > 1000: Query consistently slow, needs optimization
   - max_ms > 10000: Occasional 10s+ stall, indicates blocking/lock wait

5. INDEX USAGE:
   - idx_se_lake_id_only should show high idx_scan after our fix
   - If idx_scan = 0, index not being used (check EXPLAIN plan)

6. TABLE BLOAT:
   - dead_row_percent > 20: Table needs VACUUM
   - Run: VACUUM ANALYZE personal_access_tokens;

7. QUERY PLAN:
   - Look for "Index Scan using idx_se_lake_id_only" in plan
   - Execution Time should be < 50ms
   - If using "Seq Scan", index not working

ALERT THRESHOLDS:
- 🟢 Normal: waiting=0, longest_query<5s, blocking_queries=0
- 🟡 Warning: waiting=1-5, longest_query=5-10s, dead_row_percent=10-20%
- 🔴 Critical: waiting>5, longest_query>10s, blocking_queries>0, dead_row_percent>20%
*/
