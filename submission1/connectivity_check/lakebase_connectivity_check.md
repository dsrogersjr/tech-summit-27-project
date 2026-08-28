# Build 1 — Lakebase connectivity

**Instance:** `sentenel-tech-summit-27`  
**Database:** `sentenel_tech_summit_27`

```sql
SELECT current_database() AS database,
       current_user AS connected_as,
       version() AS pg_version;
SELECT 1 AS connectivity_ok;
```

```
        database         |        connected_as        |                                                     pg_version
-------------------------+----------------------------+--------------------------------------------------------------------------------------------------------------------
 sentenel_tech_summit_27 | doug.rogers@databricks.com | PostgreSQL 17.11 (32e7196) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit
(1 row)

 connectivity_ok
-----------------
               1
(1 row)
```
