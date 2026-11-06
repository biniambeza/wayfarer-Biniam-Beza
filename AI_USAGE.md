# AI usage

## Tools

I used **Gemini** (Gemini Flash 3.8) in VS Code for the whole project: planning, code, tests, browser checks, commit message drafts and first drafts of these docs. It did most of the writing. I chose the stack, directed the work one task at a time, reviewed the results, and made the commits myself.

## Example prompts

**"i want to make it with nextjs(ts) and sql lite so now i want you to break it with task steps then when i order you to do you have to do it"**
I pasted the brief with this. It returned 12 tasks and flagged that 3 users with one review per user can't produce a place with 312 reviews. I used that plan and worked through it one task at a time.

**"do task 7"** (booking and the parallel test)
It split the work so a naive version and a failing test came first. I committed those on their own, then asked it to continue, so the history shows the test failing before the fix and passing after it.

## When the AI was wrong

- **Wrong claim in a code comment:** it wrote that a plain transaction would overbook. A test of that claim showed it fails with `database is locked` instead, so the comment was corrected.
- **Double-click bug:** its first Book button created two bookings on a double click, even though every unit test passed. A browser check found this from the database rows, and a ref fixed it.
- **Testing against my data:** its browser checks used the same database as my running dev server, and its re-seeds would have wiped anything I had tried by hand. It noticed when deleting the database failed because my server had it open. It then moved its checks to a separate database.

These were caught by tests and checks the AI ran, not by me reading the code, so the tests are what I rely on most for the risky parts.
