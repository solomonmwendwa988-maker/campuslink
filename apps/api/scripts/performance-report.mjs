import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const focusTables = [
  'Post',
  'Comment',
  'User',
  'Listing',
  'Event',
  'Notification',
  'Message',
  'Follow',
];

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString('en-US');

try {
  console.log('\n===================================================');
  console.log('       CAMPUSLINK DATABASE PERFORMANCE REPORT');
  console.log('===================================================');
  console.log('Mode: READ-ONLY');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('---------------------------------------------------');

  // --------------------------------------------------
  // 1. DATABASE TABLE PERFORMANCE
  // --------------------------------------------------

  const tableStats = await prisma.$queryRaw`
    SELECT
      relname AS table_name,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS table_size,
      n_live_tup AS estimated_rows,
      seq_scan,
      idx_scan
    FROM pg_stat_user_tables
    WHERE relname IN (${Prisma.join(focusTables)})
    ORDER BY pg_total_relation_size(relid) DESC
  `;

  console.log('\n[1] TABLE PERFORMANCE STATISTICS');
  console.log('---------------------------------------------------');

  if (!tableStats.length) {
    console.log(
      'No table statistics found. Check database access and schema.',
    );
  } else {
    console.table(
      tableStats.map((row) => ({
        table: row.table_name,
        total_size: row.total_size,
        table_size: row.table_size,
        estimated_rows: formatNumber(row.estimated_rows),
        sequential_scans: formatNumber(row.seq_scan),
        index_scans: formatNumber(row.idx_scan),
      })),
    );
  }

  // --------------------------------------------------
  // 2. INDEX PERFORMANCE
  // --------------------------------------------------

  const indexStats = await prisma.$queryRaw`
    SELECT
      schemaname,
      relname AS tablename,
      indexrelname AS indexname,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
      idx_scan
    FROM pg_stat_user_indexes
    WHERE relname IN (${Prisma.join(focusTables)})
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 30
  `;

  console.log('\n[2] INDEX PERFORMANCE STATISTICS');
  console.log('---------------------------------------------------');

  if (!indexStats.length) {
    console.log('No index statistics returned.');
  } else {
    console.table(
      indexStats.map((row) => ({
        table: row.tablename,
        index: row.indexname,
        size: row.index_size,
        index_scans: formatNumber(row.idx_scan),
      })),
    );
  }

  // --------------------------------------------------
  // 3. DATABASE SIZE
  // --------------------------------------------------

  const databaseStats = await prisma.$queryRaw`
    SELECT
      current_database() AS database_name,
      pg_size_pretty(pg_database_size(current_database())) AS database_size,
      current_setting('server_version') AS postgres_version
  `;

  console.log('\n[3] DATABASE OVERVIEW');
  console.log('---------------------------------------------------');

  if (databaseStats.length) {
    console.table(
      databaseStats.map((row) => ({
        database: row.database_name,
        size: row.database_size,
        postgres_version: row.postgres_version,
      })),
    );
  }

  // --------------------------------------------------
  // 4. CONNECTION STATISTICS
  // --------------------------------------------------

  const connectionStats = await prisma.$queryRaw`
    SELECT
      count(*) AS total_connections,
      count(*) FILTER (WHERE state = 'active') AS active_connections,
      count(*) FILTER (WHERE state = 'idle') AS idle_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
  `;

  console.log('\n[4] CONNECTION STATISTICS');
  console.log('---------------------------------------------------');

  if (connectionStats.length) {
    console.table(
      connectionStats.map((row) => ({
        total_connections: formatNumber(row.total_connections),
        active_connections: formatNumber(row.active_connections),
        idle_connections: formatNumber(row.idle_connections),
      })),
    );
  }

  // --------------------------------------------------
  // 5. PERFORMANCE INTERPRETATION
  // --------------------------------------------------

  console.log('\n[5] PERFORMANCE NOTES');
  console.log('---------------------------------------------------');

  console.log(
    '• Sequential scans are normal for small tables.',
  );

  console.log(
    '• Index scans indicate PostgreSQL has used indexes.',
  );

  console.log(
    '• Table statistics are estimates and may not be perfectly current.',
  );

  console.log(
    '• Index scan counters are cumulative since the last statistics reset.',
  );

  console.log(
    '• Zero index scans does not automatically mean an index is unnecessary.',
  );

  console.log(
    '• Indexes improve reads but consume storage and add write overhead.',
  );

  console.log(
    '• This report does not modify database records or schema.',
  );

  // --------------------------------------------------
  // 6. NEXT-LEVEL QUERY ANALYSIS
  // --------------------------------------------------

  console.log('\n[6] ADVANCED QUERY ANALYSIS');
  console.log('---------------------------------------------------');

  console.log(
    'For detailed query latency, execution counts and slow queries:',
  );

  console.log(
    'Enable pg_stat_statements on PostgreSQL and analyze normalized query statistics.',
  );

  // --------------------------------------------------
  // REPORT COMPLETE
  // --------------------------------------------------

  console.log('\n===================================================');
  console.log('       PERFORMANCE REPORT COMPLETED');
  console.log('===================================================\n');
} catch (error) {
  console.error('\n===================================================');
  console.error('       PERFORMANCE REPORT FAILED');
  console.error('===================================================');

  console.error(
    'Check DATABASE_URL, database connectivity and PostgreSQL permissions.',
  );

  console.error(
    error instanceof Error ? error.message : 'Unknown database error',
  );

  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}