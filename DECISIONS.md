# Decisions

## Ranking

"Top rated" uses a Bayesian average:

```
score = (reviewCount × averageRating + 10 × 3.5) / (reviewCount + 10)
```

Every place starts with the weight of 10 imaginary 3.5-star reviews. A few real reviews barely move the score, and with hundreds it ends up close to the true average. The museum (312 reviews, 4.68) scores 4.64 and the café (1 review, 5.0) scores 3.64.

**Why a fixed 3.5:** I first planned to use the average of all reviews (4.41) as the starting rating, then compared both on the seed data. Using the average still put the 1-review café 4th, above a 4.37 place with 540 reviews, because an unknown place gets treated as above average. A fixed 3.5 sits below what places usually earn, so a new place has to prove itself.

**Where it breaks:**

- A good new place starts low. With only 5-star reviews, it needs 14 of them to pass the 540-review coffee house.
- 3.5 and 10 are judgement calls and won't adjust if ratings across the app drift. With real traffic I would tune them from data.
- Scores are calculated in code on each request, which suits one city. A large catalogue would need stored scores.

## Preventing overbooking

The seat check and the insert run inside a `BEGIN IMMEDIATE` transaction. It takes SQLite's write lock before the check, so other bookings wait and then see the seats this one took. Seats left is always calculated from the bookings, so there is no separate counter to drift out of sync.

**How I know it works:** the parallel test sends 80 requests from 16 separate processes at a 10-seat slot with 2 seats left. The first version checked and then inserted as two steps, and it ended up with 24–25 seats booked in 10 of 10 runs (commit `1562400`). With the fix, the same test passed 10 of 10 runs. I also sent 200 requests at a last seat, split across two server processes sharing the database: 1 succeeded and 199 got a clean refusal.

**What I considered:** a plain transaction doesn't work here. It reads first and takes the lock at the insert, so 17 of the 80 requests failed with `database is locked`.

**Where it breaks:**

- It relies on SQLite's single write lock and on every server sharing one file. On Postgres I would lock the slot row with `SELECT ... FOR UPDATE`.
- One Next.js process wouldn't hit this race, because the check and insert run with no `await` between them. The risk comes from several processes, or from adding an `await` there later. The test models several processes.
- All bookings queue on one lock, so very heavy traffic would get errors after the 5-second wait. It fails safely, without overbooking.

## Double-click and retry safety (bonus)

A lost response leaves a traveller unsure whether they booked. Each attempt now sends a key, stored under a unique constraint, and a repeat returns the original booking. The limit: changing the seat count after a lost response counts as a new attempt, so it could create a second booking.

## Other choices

- **`users.selectable` (added to the data model):** one review per user means 312 reviews need at least 312 users, so the seed adds 540 background reviewers that stay out of the switcher.
- **`await connection()` in `GET` handlers:** Next.js can't detect synchronous SQLite calls, and seat counts must never come from a build-time copy.
- **`ignore-scripts=true` in `.npmrc`:** `better-sqlite3` ships ready-made binaries, but npm otherwise tries to compile it, which fails without a C++ toolchain.

## With more time

I would add browser tests to the repo, let travellers see and cancel bookings, paginate reviews, show a clear "busy, try again" message when a booking times out on the lock, and move to Postgres with row locks if this needed more than one machine.
