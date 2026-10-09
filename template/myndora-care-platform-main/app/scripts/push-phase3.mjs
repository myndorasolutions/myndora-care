// One-off additive migration for Phase 3 (no drops, no truncates):
// - accounts: + phone, country, status columns; email unique constraint if missing
// - new tables: clinician_applications, contact_messages
import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function columnExists(table, column) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function constraintExists(name) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?",
    [name],
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  return rows.length > 0;
}

// accounts columns
if (!(await columnExists("accounts", "phone"))) {
  await conn.query("ALTER TABLE accounts ADD COLUMN phone varchar(40) NULL");
  console.log("added accounts.phone");
}
if (!(await columnExists("accounts", "country"))) {
  await conn.query("ALTER TABLE accounts ADD COLUMN country varchar(120) NULL");
  console.log("added accounts.country");
}
if (!(await columnExists("accounts", "status"))) {
  await conn.query("ALTER TABLE accounts ADD COLUMN status enum('active','suspended','deactivated') NOT NULL DEFAULT 'active'");
  console.log("added accounts.status");
}

// accounts email unique constraint
if (!(await constraintExists("accounts_email_unique"))) {
  const [dupes] = await conn.query("SELECT email, COUNT(*) c FROM accounts GROUP BY email HAVING c > 1");
  if (dupes.length > 0) throw new Error("duplicate emails present: " + JSON.stringify(dupes));
  await conn.query("ALTER TABLE accounts ADD CONSTRAINT accounts_email_unique UNIQUE (email)");
  console.log("added accounts_email_unique");
}

// clinician_applications
if (!(await tableExists("clinician_applications"))) {
  await conn.query(`CREATE TABLE clinician_applications (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    accountId bigint unsigned NULL,
    name varchar(255) NOT NULL,
    email varchar(320) NOT NULL,
    stage enum('invited','application_submitted','verification_pending','approved','suspended','rejected') NOT NULL DEFAULT 'application_submitted',
    payload text NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX clin_app_account_idx (accountId)
  )`);
  console.log("created clinician_applications");
}

// contact_messages
if (!(await tableExists("contact_messages"))) {
  await conn.query(`CREATE TABLE contact_messages (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    email varchar(320) NOT NULL,
    topic varchar(120) NOT NULL,
    message text NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log("created contact_messages");
}

await conn.end();
console.log("done");
