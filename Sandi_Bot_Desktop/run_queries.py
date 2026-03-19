"""Run SQL queries on sandi_bot.db and report all results."""
import sqlite3
import os

db = os.path.join(os.environ.get("APPDATA", ""), "com.sandibot.desktop", "sandi_bot.db")
if not os.path.exists(db):
    print("DB not found:", db)
    exit(1)

conn = sqlite3.connect(db)
cur = conn.cursor()

print("=" * 80)
print("1. Full profile status")
print("=" * 80)
cur.execute("""
SELECT 
  c.name,
  c.outcome_bucket,
  CASE WHEN d.client_id IS NULL THEN 'NO' ELSE 'YES' END as has_disc,
  CASE WHEN y.client_id IS NULL THEN 'NO' ELSE 'YES' END as has_you2,
  d.natural_d, d.natural_i, d.natural_s, d.natural_c,
  y.one_year_vision
FROM clients c
LEFT JOIN client_disc_profiles d ON c.id = d.client_id
LEFT JOIN client_you2_profiles y ON c.id = y.client_id
ORDER BY c.outcome_bucket, c.name
""")
for row in cur.fetchall():
    print(row)

print("\n" + "=" * 80)
print("2. Total counts")
print("=" * 80)
cur.execute("""
SELECT 'clients' as t, COUNT(*) as n FROM clients
UNION ALL SELECT 'disc_profiles', COUNT(*) FROM client_disc_profiles
UNION ALL SELECT 'you2_profiles', COUNT(*) FROM client_you2_profiles
UNION ALL SELECT 'coaching_sessions', COUNT(*) FROM coaching_sessions
UNION ALL SELECT 'document_extractions', COUNT(*) FROM document_extractions
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
""")
for row in cur.fetchall():
    print(row)

print("\n" + "=" * 80)
print("3. Extraction status breakdown")
print("=" * 80)
cur.execute("""
SELECT document_type, extraction_status, COUNT(*) as count
FROM document_extractions
GROUP BY document_type, extraction_status
ORDER BY document_type, extraction_status
""")
for row in cur.fetchall():
    print(row)

print("\n" + "=" * 80)
print("4. You2 vision quality check")
print("=" * 80)
cur.execute("""
SELECT c.name, LENGTH(y.one_year_vision) as vision_length,
  SUBSTR(y.one_year_vision, 1, 100) as vision_preview
FROM clients c
JOIN client_you2_profiles y ON c.id = y.client_id
ORDER BY c.name
""")
for row in cur.fetchall():
    print(row)

conn.close()
