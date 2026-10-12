create or replace function public.driver_availability_for_window(
  start_ts timestamptz,
  end_ts timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with eligible_drivers as (
    select driver.id
    from public.drivers as driver
    where driver.status in ('available', 'on_duty')
      and not exists (
        select 1
        from public.booking_requests as booking
        where booking.driver_id = driver.id
        and booking.status in ('pending', 'confirmed')
        and (
          booking.start_at is null
          or booking.end_at is null
          or (booking.start_at < end_ts and booking.end_at > start_ts)
        )
      )
  ),
  unassigned_driver_requests as (
    select count(*) as request_count
    from public.booking_requests as booking
    where booking.driver_id is null
      and booking.booking_mode ilike '%supir%'
      and booking.status in ('pending', 'confirmed')
      and (
        booking.start_at is null
        or booking.end_at is null
        or (booking.start_at < end_ts and booking.end_at > start_ts)
      )
  )
  select case
    when start_ts is null or end_ts is null or start_ts >= end_ts then false
    else (select count(*) from eligible_drivers) > (select request_count from unassigned_driver_requests)
  end;
$$;

revoke all on function public.driver_availability_for_window(timestamptz, timestamptz) from public;
grant execute on function public.driver_availability_for_window(timestamptz, timestamptz) to anon, authenticated;
