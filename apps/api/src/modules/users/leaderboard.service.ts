import { sql } from 'drizzle-orm'
import { db } from '../../db'

export type UserLeaderboardRow = {
  userId: string
  displayName: string
  avatarUrl: string | null
  reviews: number
  visits: number
  saves: number
  followers: number
  points: number
}

function cityMembershipClause(city: string | null) {
  if (!city) return sql``
  const pattern = `%${city}%`

  return sql`
    and u.id in (
      select distinct eligible_users.user_id
      from (
        select r.user_id as user_id
        from reviews r
        inner join places p on p.id = r.place_id
        where lower(p.address) like lower(${pattern})
        union
        select v.user_id as user_id
        from visits v
        inner join places p on p.id = v.place_id
        where lower(p.address) like lower(${pattern})
        union
        select s.user_id as user_id
        from saves s
        inner join places p on p.id = s.place_id
        where lower(p.address) like lower(${pattern})
      ) as eligible_users
    )
  `
}

function reviewAggregate(city: string | null) {
  if (!city) {
    return sql`
      select user_id, count(*)::int as review_total
      from reviews
      group by user_id
    `
  }

  const pattern = `%${city}%`
  return sql`
    select r.user_id as user_id, count(*)::int as review_total
    from reviews r
    inner join places p on p.id = r.place_id
    where lower(p.address) like lower(${pattern})
    group by r.user_id
  `
}

function visitAggregate(city: string | null) {
  if (!city) {
    return sql`
      select user_id, count(*)::int as visit_total
      from visits
      group by user_id
    `
  }

  const pattern = `%${city}%`
  return sql`
    select v.user_id as user_id, count(*)::int as visit_total
    from visits v
    inner join places p on p.id = v.place_id
    where lower(p.address) like lower(${pattern})
    group by v.user_id
  `
}

function saveAggregate(city: string | null) {
  if (!city) {
    return sql`
      select user_id, count(*)::int as save_total
      from saves
      group by user_id
    `
  }

  const pattern = `%${city}%`
  return sql`
    select s.user_id as user_id, count(*)::int as save_total
    from saves s
    inner join places p on p.id = s.place_id
    where lower(p.address) like lower(${pattern})
    group by s.user_id
  `
}

export async function fetchUserLeaderboard(limit = 10, city: string | null = null): Promise<UserLeaderboardRow[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 25)
  const followerPointsExpr = city ? sql`0` : sql`coalesce(fc.follower_total, 0) * 2`
  const rows = await db.execute(sql`
    select
      u.id as "userId",
      u.display_name as "displayName",
      u.avatar_url as "avatarUrl",
      coalesce(rc.review_total, 0)::int as "reviews",
      coalesce(vc.visit_total, 0)::int as "visits",
      coalesce(sc.save_total, 0)::int as "saves",
      coalesce(fc.follower_total, 0)::int as "followers",
      (
        coalesce(rc.review_total, 0) * 5 +
        coalesce(sc.save_total, 0) * 3 +
        ${followerPointsExpr} +
        coalesce(vc.visit_total, 0)
      )::int as "points"
    from users u
    left join (
      ${reviewAggregate(city)}
    ) rc on rc.user_id = u.id
    left join (
      ${visitAggregate(city)}
    ) vc on vc.user_id = u.id
    left join (
      ${saveAggregate(city)}
    ) sc on sc.user_id = u.id
    left join (
      select following_id as user_id, count(*)::int as follower_total
      from follows
      group by following_id
    ) fc on fc.user_id = u.id
    where u.is_active = true
    ${cityMembershipClause(city)}
    order by "points" desc, "reviews" desc, "saves" desc, "followers" desc, "visits" desc, u.created_at desc
    limit ${boundedLimit}
  `)

  return rows.map((row) => ({
    userId: String(row.userId),
    displayName: String(row.displayName),
    avatarUrl: row.avatarUrl ? String(row.avatarUrl) : null,
    reviews: Number(row.reviews ?? 0),
    visits: Number(row.visits ?? 0),
    saves: Number(row.saves ?? 0),
    followers: Number(row.followers ?? 0),
    points: Number(row.points ?? 0),
  }))
}
