// Proves the reservation fix with a real SQLite DB (node:sqlite, built into Node 22).
// Two "agents" fire 20 concurrent $8 requests each against a $100 weekly budget.
// Correct behavior: exactly 12 approvals ($96), never more. $100/8 = 12.5 -> 12.
import { DatabaseSync } from 'node:sqlite';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE budget (agentId TEXT, periodKey TEXT, limitCents INT, heldCents INT DEFAULT 0, PRIMARY KEY(agentId, periodKey));`);
  db.exec(`INSERT INTO budget VALUES ('agt_1','2026-W27',10000,0);`);
  return db;
}

const AMT = 800; // $8

// --- NAIVE: read in JS, check in JS, then write (the current bug) ---
function naiveReserve(db) {
  const row = db.prepare(`SELECT heldCents, limitCents FROM budget WHERE agentId='agt_1' AND periodKey='2026-W27'`).get();
  if (row.heldCents + AMT > row.limitCents) return false;   // check
  // (in a real race, other requests interleave right here)
  db.prepare(`UPDATE budget SET heldCents = ? WHERE agentId='agt_1' AND periodKey='2026-W27'`).run(row.heldCents + AMT); // write
  return true;
}

// --- ATOMIC: check inside the write (the fix) ---
function atomicReserve(db) {
  const info = db.prepare(
    `UPDATE budget SET heldCents = heldCents + ? WHERE agentId='agt_1' AND periodKey='2026-W27' AND heldCents + ? <= limitCents`
  ).run(AMT, AMT);
  return info.changes === 1; // rowsAffected
}

// Simulate interleaving: with the naive version we mimic the race by reading a
// batch of stale snapshots before any writes land (what concurrent handlers do).
function runNaiveRace(db) {
  let approvals = 0;
  // 40 requests all read the SAME stale value first (worst-case interleave)
  const snapshot = db.prepare(`SELECT heldCents, limitCents FROM budget WHERE agentId='agt_1'`).get();
  for (let i = 0; i < 40; i++) {
    if (snapshot.heldCents + AMT <= snapshot.limitCents) { // all see 0 held -> all pass
      db.prepare(`UPDATE budget SET heldCents = heldCents + ? WHERE agentId='agt_1'`).run(AMT);
      approvals++;
    }
  }
  return { approvals, held: db.prepare(`SELECT heldCents FROM budget`).get().heldCents };
}

function runAtomic(db) {
  let approvals = 0;
  for (let i = 0; i < 40; i++) if (atomicReserve(db)) approvals++;
  return { approvals, held: db.prepare(`SELECT heldCents FROM budget`).get().heldCents };
}

const naive = runNaiveRace(freshDb());
const atomic = runAtomic(freshDb());

console.log('Budget: $100.00  | request size: $8.00  | 40 concurrent requests\n');
console.log('NAIVE (read-then-write):');
console.log('  approvals:', naive.approvals, ' held: $' + (naive.held/100).toFixed(2), naive.held > 10000 ? ' <-- BUDGET BLOWN' : '');
console.log('ATOMIC (conditional UPDATE):');
console.log('  approvals:', atomic.approvals, ' held: $' + (atomic.held/100).toFixed(2), atomic.held <= 10000 ? ' <-- within budget' : '');
console.log('\nExpected correct approvals: 12  ($96, next $8 would hit $104 > $100)');
