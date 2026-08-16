-- The household's own row. Not reference data — edit the date before running.
--
-- There is exactly one child record. `birth_date` stays null until the birth,
-- and everything age-relative derives from `due_date` until it is set. Setting
-- birth_date later is a one-line update; nothing else has to change.

insert into children (name, due_date, birth_date)
select null, date '2026-10-14', null
where not exists (select 1 from children);

-- Afterwards, the day it happens:
--   update children set birth_date = date '2026-10-09';
