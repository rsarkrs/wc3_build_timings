select distinct
    'https://website-backend.w3champions.com/api/replays/' || match_id
from w3c_matches_flat
where 1=1