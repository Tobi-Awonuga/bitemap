import { pgTable, uuid, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const places = pgTable('places', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  googlePlaceId: text('google_place_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  placeId: uuid('place_id').notNull().references(() => places.id),
  rating: doublePrecision('rating').notNull(),
  body: text('body'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const saves = pgTable('saves', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  placeId: uuid('place_id').notNull().references(() => places.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  placeId: uuid('place_id').notNull().references(() => places.id),
  visitedAt: timestamp('visited_at').defaultNow().notNull(),
})

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
})

export const placeTags = pgTable('place_tags', {
  placeId: uuid('place_id').notNull().references(() => places.id),
  tagId: uuid('tag_id').notNull().references(() => tags.id),
})
