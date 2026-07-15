BEGIN;

REVOKE ALL ON FUNCTION public.claim_daily_goal(date, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_goal(date, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_goal(date, text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_daily_challenge(text, date, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_challenge(text, date, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_challenge(text, date, int) TO authenticated;

REVOKE ALL ON FUNCTION public.unlock_milestone(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_milestone(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.unlock_milestone(text, text, text, text) TO authenticated;

COMMIT;
