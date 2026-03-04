-- Update increment_coupon_usage function to check for max_uses
create or replace function increment_coupon_usage(coupon_code text)
returns boolean as $$
declare
  v_coupon coupons%rowtype;
begin
  -- Select coupon and lock the row for update
  select * into v_coupon
  from coupons
  where code = coupon_code
  for update;

  -- Check if coupon exists and is active
  if v_coupon.id is null or not v_coupon.is_active then
    return false;
  end if;

  -- Check expiry
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return false;
  end if;

  -- Check max uses
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return false;
  end if;

  -- Increment usage
  update coupons
  set used_count = used_count + 1
  where id = v_coupon.id;

  return true;
end;
$$ language plpgsql security definer;
