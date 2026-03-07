import { pgTable, uuid, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Tables ──────────────────────────────────────────────────────────────────

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
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  visitId: uuid('visit_id').references(() => visits.id, { onDelete: 'set null' }),
  rating: doublePrecision('rating').notNull(),
  body: text('body'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const saves = pgTable('saves', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  visitedAt: timestamp('visited_at').defaultNow().notNull(),
})

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
})

export const placeTags = pgTable('place_tags', {
  placeId: uuid('place_id').notNull().references(() => places.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  saves: many(saves),
  visits: many(visits),
  reviews: many(reviews),
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
