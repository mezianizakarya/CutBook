-- ============================================================================
-- Invitation codes are strictly single-use.
--
-- A redeemed code stays used forever -- even if the barber who redeemed it
-- later leaves the shop -- so it can never be redeemed a second time. This
-- removes the free-on-leave trigger added in 20260808140000.
-- ============================================================================

drop trigger if exists shop_members_free_invitation on public.shop_members;
drop function if exists private.free_used_invitation();
