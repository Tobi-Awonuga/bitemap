import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { places } from '../db/schema'

type SeedPlace = {
  name: string
  cuisine: string
  description: string
  address: string
  latitude: number
  longitude: number
  priceLevel: number
}

const seedPlaces: SeedPlace[] = [
  {
    name: 'Union Social Kitchen',
    cuisine: 'Brunch',
    description: 'All-day brunch and comfort dishes near downtown Toronto.',
    address: '21 St Clair Ave W, Toronto, ON, Canada',
    latitude: 43.6889,
    longitude: -79.3944,
    priceLevel: 2,
  },
  {
    name: 'Harbour Sushi House',
    cuisine: 'Japanese',
    description: 'Sushi and sashimi with a modern casual menu.',
    address: '99 Queens Quay W, Toronto, ON, Canada',
    latitude: 43.6399,
    longitude: -79.3803,
    priceLevel: 3,
  },
  {
    name: 'Yorkville Grill',
    cuisine: 'Steak',
    description: 'Steak and seafood in a polished Yorkville setting.',
    address: '131 Bloor St W, Toronto, ON, Canada',
    latitude: 43.6696,
    longitude: -79.3929,
    priceLevel: 4,
  },
  {
    name: 'Queen Street Burger Co',
    cuisine: 'Burgers',
    description: 'Classic burgers, fries, and shakes.',
    address: '450 Queen St W, Toronto, ON, Canada',
    latitude: 43.6488,
    longitude: -79.4016,
    priceLevel: 1,
  },
  {
    name: 'Little Lisbon Bistro',
    cuisine: 'Portuguese',
    description: 'Portuguese small plates and grilled specialties.',
    address: '742 Dundas St W, Toronto, ON, Canada',
    latitude: 43.6521,
    longitude: -79.4096,
    priceLevel: 2,
  },
  {
    name: 'Riverside Pasta Bar',
    cuisine: 'Italian',
    description: 'Housemade pasta with seasonal ingredients.',
    address: '888 Queen St E, Toronto, ON, Canada',
    latitude: 43.6595,
    longitude: -79.3351,
    priceLevel: 3,
  },
]

async function upsertSeedPlace(seedPlace: SeedPlace): Promise<'inserted' | 'updated' | 'unchanged'> {
  const existing = await db.query.places.findFirst({
    where: and(eq(places.name, seedPlace.name), eq(places.address, seedPlace.address)),
    columns: { id: true, priceLevel: true, cuisine: true, description: true },
  })

  if (!existing) {
    await db.insert(places).values(seedPlace)
    return 'inserted'
  }

  const needsUpdate =
    existing.priceLevel !== seedPlace.priceLevel ||
    existing.cuisine !== seedPlace.cuisine ||
    existing.description !== seedPlace.description

  if (!needsUpdate) return 'unchanged'

  await db
    .update(places)
    .set({
      cuisine: seedPlace.cuisine,
      description: seedPlace.description,
      priceLevel: seedPlace.priceLevel,
    })
    .where(eq(places.id, existing.id))

  return 'updated'
}

async function main(): Promise<void> {
  let inserted = 0
  let updated = 0
  let unchanged = 0

  for (const place of seedPlaces) {
    const result = await upsertSeedPlace(place)
    if (result === 'inserted') inserted += 1
    if (result === 'updated') updated += 1
    if (result === 'unchanged') unchanged += 1
  }

  console.log(
    `Seed complete: inserted=${inserted}, updated=${updated}, unchanged=${unchanged}, total=${seedPlaces.length}`,
  )
  process.exit(0)
}

void main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
