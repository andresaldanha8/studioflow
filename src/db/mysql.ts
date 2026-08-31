import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export async function initMysql() {
  if (pool) return pool;
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  pool = mysql.createPool({ host, port, user, password, database, waitForConnections: true, connectionLimit: 10 });

  // create table if not exists
  const createSql = `
    CREATE TABLE IF NOT EXISTS studioflow_state (
      id INT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(createSql);

  return pool;
}

export async function getState(): Promise<any | null> {
  if (!pool) throw new Error('MySQL not initialized');
  const [rows] = await pool.query('SELECT data FROM studioflow_state WHERE id = 1 LIMIT 1');
  const result: any = (rows as any[])[0];
  if (!result) return null;
  return result.data;
}

export async function upsertState(data: any): Promise<void> {
  if (!pool) throw new Error('MySQL not initialized');
  // Use parameterized query; mysql2 will convert JS object to JSON when appropriate
  await pool.query('INSERT INTO studioflow_state (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [JSON.stringify(data)]);
}
