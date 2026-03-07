import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const places = pgTable('places', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  cuisine: text('cuisine'),
  description: text('description'),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  googlePlaceId: text('google_place_id').unique(),
  priceLevel: integer('price_level'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  latIdx: index('places_latitude_idx').on(table.latitude),
  lngIdx: index('places_longitude_idx').on(table.longitude),
}))

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  visitId: uuid('visit_id').references(() => visits.id, { onDelete: 'set null' }),
  rating: doublePrecision('rating').notNull(),
  body: text('body'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userPlaceUnique: uniqueIndex('reviews_user_place_unique').on(table.userId, table.placeId),
  placeIdx: index('reviews_place_id_idx').on(table.placeId),
  userIdx: index('reviews_user_id_idx').on(table.userId),
}))

export const saves = pgTable('saves', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userPlaceUnique: uniqueIndex('saves_user_place_unique').on(table.userId, table.placeId),
  userIdx: index('saves_user_id_idx').on(table.userId),
  placeIdx: index('saves_place_id_idx').on(table.placeId),
}))

export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  visitedAt: timestamp('visited_at').defaultNow().notNull(),
}, (table) => ({
  userPlaceUnique: uniqueIndex('visits_user_place_unique').on(table.userId, table.placeId),
  userIdx: index('visits_user_id_idx').on(table.userId),
  placeIdx: index('visits_place_id_idx').on(table.placeId),
}))

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
})

export const placeTags = pgTable('place_tags', {
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
})

export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  followerFollowingUnique: uniqueIndex('follows_follower_following_unique').on(table.followerId, table.followingId),
  followerIdx: index('follows_follower_id_idx').on(table.followerId),
  followingIdx: index('follows_following_id_idx').on(table.followingId),
}))

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  saves: many(saves),
  visits: many(visits),
  reviews: many(reviews),
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
}))

export const placesRelations = relations(places, ({ many }) => ({
  reviews: many(reviews),
  saves: many(saves),
  visits: many(visits),
  placeTags: many(placeTags),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  place: one(places, { fields: [reviews.placeId], references: [places.id] }),
  visit: one(visits, { fields: [reviews.visitId], references: [visits.id] }),
}))

export const savesRelations = relations(saves, ({ one }) => ({
  user: one(users, { fields: [saves.userId], references: [users.id] }),
  place: one(places, { fields: [saves.placeId], references: [places.id] }),
}))

export const visitsRelations = relations(visits, ({ one, many }) => ({
  user: one(users, { fields: [visits.userId], references: [users.id] }),
  place: one(places, { fields: [visits.placeId], references: [places.id] }),
  reviews: many(reviews),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  placeTags: many(placeTags),
}))

export const placeTagsRelations = relations(placeTags, ({ one }) => ({
  place: one(places, { fields: [placeTags.placeId], references: [places.id] }),
  tag: one(tags, { fields: [placeTags.tagId], references: [tags.id] }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}))
