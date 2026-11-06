import { describe, expect, it } from "vitest";
import { PRIOR_RATING, rankByScore, rankingScore } from "./ranking";

const museum = { name: "museum", reviewCount: 312, averageRating: 4.7 };
const newCafe = { name: "new cafe", reviewCount: 1, averageRating: 5 };
const coffeeHouse = { name: "coffee house", reviewCount: 540, averageRating: 4.4 };

describe("rankingScore", () => {
  it("ranks 312 reviews averaging 4.7 above a single 5-star review", () => {
    expect(rankingScore(museum)).toBeGreaterThan(rankingScore(newCafe));
  });

  it("ranks a well-established 4.4 above a single 5-star review", () => {
    expect(rankingScore(coffeeHouse)).toBeGreaterThan(rankingScore(newCafe));
  });

  it("gives more weight to the same average as reviews build up", () => {
    const fewReviews = { reviewCount: 5, averageRating: 4.8 };
    const manyReviews = { reviewCount: 500, averageRating: 4.8 };

    expect(rankingScore(manyReviews)).toBeGreaterThan(rankingScore(fewReviews));
  });

  it("approaches the real average once there are many reviews", () => {
    const score = rankingScore({ reviewCount: 100_000, averageRating: 4.2 });

    expect(score).toBeCloseTo(4.2, 2);
  });

  it("uses the prior for a place with no reviews", () => {
    expect(rankingScore({ reviewCount: 0, averageRating: 0 })).toBe(PRIOR_RATING);
  });

  it("does not let one bad review sink a place below a consistently bad one", () => {
    const oneBadReview = { reviewCount: 1, averageRating: 1 };
    const consistentlyBad = { reviewCount: 200, averageRating: 2 };

    expect(rankingScore(oneBadReview)).toBeGreaterThan(rankingScore(consistentlyBad));
  });

  it("lets a new place with only 5-star reviews overtake at 15 reviews", () => {
    const allFiveStars = (reviewCount: number) => ({ reviewCount, averageRating: 5 });

    expect(rankingScore(allFiveStars(14))).toBeLessThan(rankingScore(coffeeHouse));
    expect(rankingScore(allFiveStars(15))).toBeGreaterThan(rankingScore(coffeeHouse));
  });
});

describe("rankByScore", () => {
  it("orders the brief's example differently from a plain average", () => {
    const places = [newCafe, coffeeHouse, museum];
    const byPlainAverage = [...places].sort((a, b) => b.averageRating - a.averageRating);

    expect(byPlainAverage[0]).toBe(newCafe);
    expect(rankByScore(places)).toEqual([museum, coffeeHouse, newCafe]);
  });

  it("puts the place with more reviews first when scores are equal", () => {
    // Both are exactly the prior, so both score the same.
    const fewer = { reviewCount: 2, averageRating: PRIOR_RATING };
    const more = { reviewCount: 20, averageRating: PRIOR_RATING };

    expect(rankByScore([fewer, more])).toEqual([more, fewer]);
  });

  it("does not modify the array it is given", () => {
    const places = [newCafe, museum];

    rankByScore(places);

    expect(places).toEqual([newCafe, museum]);
  });
});
