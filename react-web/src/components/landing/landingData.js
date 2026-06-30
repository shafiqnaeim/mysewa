/** Fallback trending cards when API has fewer than 5 listings. */
export const TRENDING_FALLBACK = [
  {
    id: 'demo-1',
    name: 'Sri Permata Room',
    location: 'Gong Badak, Kuala Nerus',
    price: 450,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    petFriendly: true,
    neighborhoodScore: 94,
  },
  {
    id: 'demo-2',
    name: 'Campus View Apartment',
    location: 'Universiti Malaysia Terengganu',
    price: 680,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    petFriendly: false,
    neighborhoodScore: 91,
  },
  {
    id: 'demo-3',
    name: 'UniSZA Terrace House',
    location: 'Kuala Terengganu',
    price: 520,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    petFriendly: true,
    neighborhoodScore: 96,
  },
  {
    id: 'demo-4',
    name: 'Marang Student Suite',
    location: 'Marang, Terengganu',
    price: 390,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
    petFriendly: false,
    neighborhoodScore: 88,
  },
  {
    id: 'demo-5',
    name: 'Seaview Shared Unit',
    location: 'Kuala Ibai',
    price: 550,
    image: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80',
    petFriendly: true,
    neighborhoodScore: 95,
  },
  {
    id: 'demo-6',
    name: 'IPGM Campus Lodge',
    location: 'Besut, Terengganu',
    price: 420,
    image: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=800&q=80',
    petFriendly: false,
    neighborhoodScore: 90,
  },
]

export const TESTIMONIALS = [
  {
    quote: 'Found a room near UMT in two days. No agent fees, and the landlord replied the same evening.',
    name: 'Aina R.',
    role: 'UMT student',
  },
  {
    quote: 'Listing my terrace house was straightforward. Applications come in with student details already filled.',
    name: 'Encik Razak',
    role: 'Landlord, Kuala Nerus',
  },
  {
    quote: 'The campus filter saved me hours. I could compare distance and house rules before applying.',
    name: 'Hafiz M.',
    role: 'UniSZA student',
  },
]

export function neighborhoodScoreForItem(item, index = 0) {
  if (item.neighborhoodScore) return item.neighborhoodScore
  const base = 85 + ((Number(item.id) || index * 7) % 14)
  return Math.min(99, base)
}

export function mapApiItemToTrending(item, index) {
  const image =
    item.coverImageUrl ||
    item.imageUrl ||
    item.thumbnailUrl ||
    TRENDING_FALLBACK[index % TRENDING_FALLBACK.length].image

  return {
    id: item.id,
    name: item.name || 'Rental listing',
    location: [item.location, item.campus, item.city].filter(Boolean).join(', ') || 'Terengganu',
    price: Number(item.price) || 0,
    image,
    petFriendly: String(item.petPolicy || item.pets || '').toLowerCase().includes('allow'),
    neighborhoodScore: neighborhoodScoreForItem(item, index),
    raw: item,
  }
}
