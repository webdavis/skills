---
name: pylon-note
description: >-
  Write the internal case note for a Pylon support issue about a call an AI phone agent handled, in
  one fixed shape (DIAGNOSIS, TESTING, DRAFT REPLY), and copy the draft customer reply to the
  clipboard. Use it whenever the user is working a Pylon ticket, looking into a call the agent took,
  writing up what happened on a call, working out whether a miss was the agent, a setting or a bug,
  or drafting a reply to a customer about a booking or capacity problem, even when they only say
  "write this up", "note for this ticket" or "/tech-support:pylon-note".
---

# Pylon note

One shape for every case note, so a manager can read twenty of them the same way and the draft
reply is always in the same place. The note is internal. The reply is for the customer, after the
manager has seen it.

## Gather before you write

Fill the note from evidence, not from memory of similar cases:

- **The Pylon issue**: what the customer reported, which account, when.
- **The call**: the recording or transcript link; what the caller asked for, as the call log shows
  it; the agent's tool calls in the order they ran.
- **Capacity**: what the availability lookup returned, and what cut it down or emptied it (capacity
  rules, a service that is turned off, hours, the location it searched).
- **The account's setup**, where the symptom points at it: hours, calendars, locations, routing, the
  rules and toggles the customer can see in their dashboard.
- **Prior cases**: earlier Pylon issues with the same symptom and what the senior agent did on them,
  anything engineering said, and open Linear tickets.
- **What was tested**: what the customer has changed since the ticket, what you turned on or changed
  in the test environment, what the agent did then, and that you put it back.

Use the Pylon, Linear and log tools your harness has (MCP servers or CLIs). When a tool is missing,
ask the user to paste what it would have shown rather than guessing at it. Anything you looked for
and did not find is `none`. A cause named in DIAGNOSIS needs its evidence in the same bullet.

## The note

Three sections, bold with a colon, in this order. A section with nothing to say holds the one line
`none`. Never drop a section; the sameness is what makes the notes comparable.

```text
**DIAGNOSIS:**
- Call: <link>
- <what the caller asked for, with the log line in backticks>
- <what the agent found, and what cut it down or emptied it, with the rule or setting that did it>
<screenshot: the rule or setting>
- <each further cause, one bullet, with its evidence>
- <prior cases, when there are any: the Pylon issue and what was done, what engineering said, the
  Linear ticket>

**TESTING:**
- <what the customer has changed since, and what the agent does now>
- <what you turned on or changed in the test environment, what the agent did, and that you put it
  back>

**DRAFT REPLY (manager to review):**

<reply>
```

How the bullets read:

- Log lines, identifiers, tool names, values and anything copied out of a system go in backticks,
  so they stand apart from your words: `{"intent":"book","window":"same_day"}`.
- Where a rule, a setting or a screen is the evidence, leave `<screenshot: what to capture>` on its
  own line under the bullet; the user pastes the image there.
- A cause carries its measurement: "the capacity rules cut it from 7 slots to 1", not "a capacity
  issue". When the evidence does not settle a cause, write `unknown` and what would settle it; a
  confident wrong answer closes a case that is not closed.
- Numbers of slots, times and dates come from the log, never from the ticket's wording.

## The reply

The reply is written for the customer and read first by the manager. These rules hold every time:

1. The cause takes three sentences at most.
2. Do not restate the ticket. They wrote it.
3. One ask at the end, and only when something is needed from them.
4. No headings, bullets or bold, unless you are giving steps to follow.
5. Plain words. No "we found two causes" style introductions; say the thing.
6. No em-dashes, and none of the phrases that mark text as machine-written: "I understand your
   frustration", "rest assured", "please note", "we apologize for any inconvenience", "reach out",
   "as per", "at this time", "going forward".
7. Written so a high-school student follows it on the first read.
8. No internal detail: no tool names, log lines, code, versions, our ticket numbers or the name of
   our test tools. The customer's own settings, by the names they see in their dashboard, are fine;
   that is how they will find them.
9. The reply is copied to the clipboard automatically (next section), so the manager can paste it.

Its shape, top to bottom: a greeting (`Hi Team,` or the contact's name); one line of thanks if you
like; the cause, in the customer's terms; what has changed or what you did, and what you saw when
you tested it; an alternative when they have one (keep your rules and turn on X instead); a
`<screenshot: ...>` line where a picture of the setting helps them; a closing line; then the
sign-off. The sign-off is `Thank you,` followed by your name and company, taken from the
`PYLON_NOTE_SIGNATURE` environment variable (set it once in your shell; it is never written into this
skill). When it is unset, ask the user for it once in the session.

**Example** (fictional):

> Hi Team,
>
> Thanks for flagging this. Your two capacity rules removed every same-day slot, so the agent had
> nothing to offer the caller. I see you have turned them off since, and in our test setup the agent
> now offers same-day times.
>
> You can also keep those rules on: turn on emergency hours for your priority 1 job types. I tested
> that too, and the agent offered an emergency slot right away. Here is an example of the setting and
> how the agent responds:
>
> \<screenshot: the emergency hours setting filled in, and the agent offering a slot>
>
> You should be good to go!
>
> Thank you,
> \<name>
> \<company>

Not this: "I understand how frustrating this must be — rest assured our team has identified two root
causes in the availability lookup (check_availability returned an empty slot array due to a
default_location mismatch)". It restates, apologizes in the stock way, uses an em-dash and hands the
customer the internals.

## Copy the reply

After printing the note, pipe the reply alone (greeting through sign-off) through the bundled
script:

```bash
printf '%s\n' "<reply>" | <this skill's folder>/scripts/copy-reply.sh
```

It uses `pbcopy`, `wl-copy`, `xclip` or `clip.exe`, whichever the machine has, and prints which one.
When none exists it says so and exits 1; then the user copies by hand. Tell the user what happened
in one line after the note.

## Keep it clean

This skill is public. Nothing in this folder may hold customer names, phone numbers, account
identifiers, internal links, product or company names, or a real signature; examples stay fictional.
The notes themselves live in the user's tools, never here.
