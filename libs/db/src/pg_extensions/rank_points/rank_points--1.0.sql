CREATE OR REPLACE FUNCTION get_points_for_rank(rank integer, completions integer)
    RETURNS integer
AS
'MODULE_PATHNAME',
'get_points_for_rank'
    LANGUAGE C IMMUTABLE
               STRICT;

COMMENT ON FUNCTION get_points_for_rank(integer, integer) IS
    'Calculate total rank points for given rank and completions count';
