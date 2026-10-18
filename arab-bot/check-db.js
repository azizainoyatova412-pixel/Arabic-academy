const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
(async () => {
  const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  for (const row of t.rows) {
    const name = row.table_name;
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [name]);
    const cnt = await pool.query('SELECT COUNT(*) FROM "' + name + '"');
    console.log(name, '| qatorlar:', cnt.rows[0].count);
    console.log('  ustunlar:', cols.rows.map(c => c.column_name + ':' + c.data_type).join(', '));
  }
  await pool.end();
})();
