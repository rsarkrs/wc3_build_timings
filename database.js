import sqlite3 from 'sqlite3';

const verboseSqlite3 = sqlite3.verbose();

export function saveTableToDatabase(tableSchema, values, dbFilePath) {
  return new Promise((resolve, reject) => {
    // Open the database
    let db = new verboseSqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error(err.message);
        reject(err);
        return;
      }
      console.log('Connected to the SQLite database.');
    });

    // Create a dynamic table creation statement based on tableSchema
    const columns = Object.entries(tableSchema).map(([key, type]) => `${key} ${type}`).join(', ');
    const createTableStmt = `CREATE TABLE IF NOT EXISTS dictionary (${columns})`;

    // Create batches of 250 items
    const createBatches = (array, batchSize) => {
      const batches = [];
      for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
      }
      return batches;
    };

    const retryWithDelay = async (fn, retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (err) {
          if (err.code === 'SQLITE_BUSY' && i < retries - 1) {
            console.log(`Database is busy. Retrying... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }
    };

    const processBatch = async (batch) => {
      await retryWithDelay(() => {
        return new Promise((resolve, reject) => {
          db.serialize(() => {
            db.run(createTableStmt, (err) => {
              if (err) {
                console.error(err.message);
                reject(err);
                return;
              }

              const placeholders = Object.keys(tableSchema).map(() => '?').join(', ');
              const insertStmt = `INSERT OR REPLACE INTO dictionary (${Object.keys(tableSchema).join(', ')}) VALUES (${placeholders})`;
              const stmt = db.prepare(insertStmt);

              batch.forEach((row) => {
                stmt.run(row, (err) => {
                  if (err) {
                    console.error(err.message);
                    reject(err);
                    return;
                  }
                });
              });

              stmt.finalize((err) => {
                if (err) {
                  console.error(err.message);
                  reject(err);
                  return;
                }
                resolve();
              });
            });
          });
        });
      });
    };

    const batches = createBatches(values, 250);
    const processAllBatches = async () => {
      for (const batch of batches) {
        await processBatch(batch);
      }
    };

    processAllBatches()
      .then(() => {
        db.close((err) => {
          if (err) {
            console.error(err.message);
            reject(err);
            return;
          }
          console.log('Closed the database connection.');
          resolve();
        });
      })
      .catch((err) => {
        db.close();
        reject(err);
      });
  });
}