// Demo data for Addis Ababa. Landmarks use real names, businesses use invented
// ones, and every review is made up.

export const SELECTABLE_USERS = ["Sara", "Abel", "Liya"] as const;

type SelectableUser = (typeof SELECTABLE_USERS)[number];

// Reviews shown with a recognisable author. They also let a selectable user
// update an existing review, while Sara can always write a new one.
interface NamedReview {
  user: SelectableUser;
  rating: number;
  body: string;
}

// Number of background reviews for each star rating.
interface CrowdRatings {
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

interface SeedSlot {
  daysFromNow: number;
  hour: number; // local time in Addis Ababa
  capacity: number;
  bookedSeats: number;
}

export interface SeedPlace {
  name: string;
  category: string;
  description: string;
  openingHours: string;
  namedReviews: NamedReview[];
  crowd: CrowdRatings;
  slots: SeedSlot[];
}

const NO_CROWD: CrowdRatings = {
  oneStar: 0,
  twoStar: 0,
  threeStar: 0,
  fourStar: 0,
  fiveStar: 0,
};

export const CROWD_REVIEW_TEXT: Record<number, string[]> = {
  1: ["Very disappointing, would not go back.", "Not worth the trip."],
  2: ["Below what I expected.", "Some good moments, but mostly a letdown."],
  3: ["Decent, but nothing special.", "Fine if you are nearby."],
  4: ["Really enjoyable, worth a visit.", "Very good, with a few small flaws."],
  5: ["Absolutely wonderful!", "A highlight of my trip.", "Do not miss this place."],
};

export const PLACES: SeedPlace[] = [
  {
    name: "National Museum of Ethiopia",
    category: "History",
    description:
      "Home to the famous fossil Lucy, with collections spanning prehistory, royal history and modern art.",
    openingHours: "08:30–17:30",
    namedReviews: [
      { user: "Abel", rating: 5, body: "Go early, the guide is excellent." },
      { user: "Liya", rating: 4, body: "Great, but the café was closed." },
    ],
    crowd: { oneStar: 2, twoStar: 4, threeStar: 14, fourStar: 51, fiveStar: 239 },
    slots: [
      { daysFromNow: 2, hour: 9, capacity: 10, bookedSeats: 6 },
      { daysFromNow: 2, hour: 11, capacity: 10, bookedSeats: 9 },
      { daysFromNow: 2, hour: 14, capacity: 10, bookedSeats: 10 },
    ],
  },
  {
    name: "Holy Trinity Cathedral",
    category: "History",
    description:
      "A landmark Ethiopian Orthodox cathedral known for its stained glass and imperial tombs.",
    openingHours: "08:00–17:00",
    namedReviews: [
      { user: "Liya", rating: 5, body: "Beautiful stained glass, and very peaceful." },
    ],
    crowd: { oneStar: 2, twoStar: 4, threeStar: 12, fourStar: 40, fiveStar: 129 },
    slots: [
      { daysFromNow: 3, hour: 10, capacity: 8, bookedSeats: 3 },
      { daysFromNow: 4, hour: 15, capacity: 8, bookedSeats: 0 },
    ],
  },
  {
    name: "Entoto Park",
    category: "Nature",
    description:
      "Forested hills above the city, with walking trails, fresh air and wide views over Addis Ababa.",
    openingHours: "07:00–18:00",
    namedReviews: [
      { user: "Abel", rating: 4, body: "Great views, but bring a jacket." },
    ],
    crowd: { oneStar: 1, twoStar: 2, threeStar: 7, fourStar: 25, fiveStar: 60 },
    slots: [{ daysFromNow: 3, hour: 8, capacity: 12, bookedSeats: 5 }],
  },
  {
    name: "Unity Park",
    category: "Nature",
    description:
      "Gardens and pavilions in the grounds of the former palace, with a small zoo.",
    openingHours: "09:00–17:00",
    namedReviews: [],
    crowd: { oneStar: 3, twoStar: 5, threeStar: 10, fourStar: 15, fiveStar: 12 },
    slots: [],
  },
  {
    name: "Merkato Market",
    category: "Culture",
    description:
      "One of the largest open-air markets in Africa, best explored with someone who knows the way.",
    openingHours: "08:00–19:00",
    namedReviews: [],
    crowd: { oneStar: 3, twoStar: 7, threeStar: 20, fourStar: 50, fiveStar: 40 },
    slots: [{ daysFromNow: 5, hour: 10, capacity: 6, bookedSeats: 5 }],
  },
  {
    name: "Ethnological Museum",
    category: "History",
    description:
      "Everyday life and traditions of Ethiopia's peoples, set inside the former palace of Haile Selassie.",
    openingHours: "08:00–17:00",
    namedReviews: [],
    crowd: { oneStar: 1, twoStar: 2, threeStar: 6, fourStar: 20, fiveStar: 45 },
    slots: [],
  },
  {
    name: "Corner Coffee House",
    category: "Food",
    description:
      "A busy neighbourhood coffee house serving traditional roasts, popular with locals every morning.",
    openingHours: "07:00–20:00",
    namedReviews: [],
    crowd: { oneStar: 7, twoStar: 18, threeStar: 55, fourStar: 150, fiveStar: 310 },
    slots: [],
  },
  {
    name: "Habesha Table",
    category: "Food",
    description:
      "Traditional dishes served on injera, with live music and dancing in the evenings.",
    openingHours: "11:00–23:00",
    namedReviews: [],
    crowd: { oneStar: 3, twoStar: 7, threeStar: 20, fourStar: 60, fiveStar: 120 },
    slots: [],
  },
  {
    // The brief's ranking trap: one 5-star review must not beat the museum.
    name: "Bole Corner Café",
    category: "Food",
    description: "A brand-new café near Bole with a very short menu and a very good macchiato.",
    openingHours: "08:00–18:00",
    namedReviews: [{ user: "Abel", rating: 5, body: "New, small, and lovely." }],
    crowd: NO_CROWD,
    slots: [],
  },
  {
    name: "Sunrise Bakery",
    category: "Food",
    description: "A tiny family bakery that usually sells out of fresh bread by midday.",
    openingHours: "06:30–14:00",
    namedReviews: [
      { user: "Abel", rating: 5, body: "Best bread in the area." },
      { user: "Liya", rating: 4, body: "Tasty, but get there early." },
    ],
    crowd: NO_CROWD,
    slots: [],
  },
];
