import express from 'express';
import { Pool, PoolClient } from 'pg';

const app = express();
const pool = new Pool({
  user: 'admin',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'db-transaction'
});

const buyOptimisticLockIn = async (connect: PoolClient) => {
  const data = await connect.query('SELECT amount,version FROM stock where id = 1')
  const { amount, version } = data?.rows?.find(Boolean) || {};
  if (!amount || amount <= 0) {
    console.log('nothing to buy');
    return
  }

  try {
    await pool.query('BEGIN')
    await connect.query('UPDATE stock SET amount = amount - 1, version = version + 1 WHERE id =1 AND version=' + version)
    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
  }

}

const buyPessimisticLockIn = async (connect: PoolClient) => {
  const data = await connect.query('SELECT amount FROM stock where id = 1 FOR UPDATE')
  const amount = data?.rows?.find(Boolean)?.amount;

  if (!amount || amount <= 0) {
    console.log('nothing to buy');
    return
  }

  try {
    await pool.query('BEGIN')
    await pool.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE READ')
    await connect.query('UPDATE stock SET amount = amount - 1 WHERE id =1')
    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
  }
}

(async () => {
  const connect = await pool.connect()

  await connect.query(`CREATE TABLE IF NOT EXISTS stock
  (
    id integer PRIMARY KEY,
    amount integer,
    version integer
  )`)

  app.listen(5000, () => {
    console.log('Server is running on port 5000');
  });

  await buyOptimisticLockIn(connect)
})()