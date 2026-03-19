"""Query document_extractions, delete You2 non-complete, confirm."""
import sqlite3
import os

db = os.path.join(os.environ.get("APPDATA", ""), "com.sandibot.desktop", "sandi_bot.db")
if not os.path.exists(db):
    print("DB not found:", db)
    exit(1)

conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute(
    "SELECT document_type, extraction_status, COUNT(*) "
    "FROM document_extractions GROUP BY document_type, extraction_status"
)
print("BEFORE:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]}")

cur.execute(
    "DELETE FROM document_extractions "
    "WHERE document_type = 'you2' AND extraction_status != 'complete'"
)
print("\nDeleted:", cur.rowcount)
conn.commit()

cur.execute(
    "SELECT document_type, extraction_status, COUNT(*) "
    "FROM document_extractions GROUP BY document_type, extraction_status"
)
print("\nAFTER:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]}")

conn.close()
