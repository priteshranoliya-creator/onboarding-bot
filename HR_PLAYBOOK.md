# Onboarding Bot — HR Playbook

**devx Ai Labs** | Last updated: April 2026

---

## How It Works (Simple Overview)

```
HR fills Slack List
       |
       v
Status --> "Confirmed"
       |
       v
Bot syncs data automatically
       |
       v
Bot handles everything from here:
  - Validates all fields are complete
  - Sends emails at the right time
  - Notifies buddy, POD leader, HR
  - Posts welcome messages
  - Tracks checklist progress
```

**You only need to do 2 things:**
1. Fill all fields in the Slack List
2. Set Status to **"Confirmed"** when ready

The bot does the rest.

---

## What HR Needs to Fill in the Slack List

### Required Fields (must be filled BEFORE confirming)

| Field | Example | Why |
|-------|---------|-----|
| Name | Rahul Sharma | Used in all emails and messages |
| Work Email | rahul.sharma@devxlabs.ai | Handbook email sent here + login credentials shown in welcome email |
| Personal Email | rahul@gmail.com | Welcome email sent here |
| Role | SDE / Designer / QA | Mentioned in all communications |
| Joining Date | 2026-05-15 | Drives the entire timeline |
| POD Name | Apex / Nova | Mentioned in emails and Slack |
| POD Lead | @Smit Patel (People picker) | Gets DM + email notification |
| Buddy | @Pritesh (People picker) | Gets DM + email notification |
| Temp Password | Welcome@123 | Sent in welcome email to joinee |
| Mode | Offline / Remote / Hybrid | Shown in welcome email |

### Optional Fields

| Field | Notes |
|-------|-------|
| Job Type | fulltime / intern |
| Resume | Google Drive link |
| Location | Office location |
| Phone | Joinee's phone number |
| Department | Team / department name |

---

## Timeline — What Happens and When

### D-7 (7 days before joining)

**Bot checks:** Are all required fields filled?

```
All fields filled?
  |
  |-- YES --> HR gets DM:
  |           "All set -- Rahul joins in 7 days.
  |            Emails will be sent on D-1."
  |
  |-- NO  --> HR gets DM:
              "Rahul joins in 7 days but missing:
               - Buddy
               - Temp Password
               Please update the Slack List."
```

**Who gets notified:** HR only (via Slack DM)

---

### D-6 to D-2 (daily checks)

If fields are still missing, HR gets a **daily reminder** until fixed.

Once HR updates the Slack List and toggles Status back to "Confirmed", the bot picks up the changes automatically.

**Who gets notified:** HR only

---

### D-3 (3 days before joining)

HR gets a **progress reminder:**

> "Rahul joins in 3 days.
> Emails: Will be sent on D-1.
> All fields ready."

**Who gets notified:** HR only

---

### D-1 (1 day before joining) — THE BIG DAY

**4 emails are sent automatically:**

```
Email 1: Welcome + Login Credentials
  To: Joinee's PERSONAL email
  Contains: Office address, reporting time, joining date with day,
            buddy name, POD info, work email, temp password,
            work mode, payroll link, Slack link, document upload form,
            onboarding lunch note (uses actual joining day)

Email 2: Employee Handbook + Policies (8 documents)
  To: Joinee's WORK email
  Contains: Asset Policy, Referral Policy, Separation Policy,
            Leave Policy, POSH Policy, Reimbursement Process,
            WFH Policy, Plum Health Insurance Handbook,
            Acknowledgment form link

Email 3: Buddy Notification
  To: Buddy's work email
  Contains: Joinee details, buddy responsibilities checklist

Email 4: POD Leader Notification
  To: POD Leader's work email
  Contains: Joinee details, request for handshake meeting
```

**Slack messages sent automatically:**

```
#hr-onboarding channel:
  - New Joiner announcement with all details
  - Interactive checklist (35 items) as thread reply

Buddy gets Slack DM:
  - "You've been assigned as joining buddy for Rahul"
  - Full responsibilities list

POD Leader gets Slack DM:
  - "New POD member -- Rahul joining as SDE in Apex"
  - "Let me know a suitable time for a handshake"

HR gets Slack DM:
  - "All 4 onboarding emails sent for Rahul"
  - Link to the checklist thread
```

**Who gets notified:**

| Person | Email | Slack DM |
|--------|-------|----------|
| Joinee (personal email) | Welcome + credentials | -- |
| Joinee (work email) | Handbook + policies | -- |
| Buddy | Buddy assignment | Buddy assignment + responsibilities |
| POD Leader | New POD member | New POD member + handshake request |
| HR (Pooja) | -- | Confirmation + checklist link |

---

### D-0 (Joining Day)

**Slack messages sent automatically:**

```
#general channel:
  - "Welcome Rahul joining as SDE in Apex POD! Say hi!"

Joinee gets Slack DM (on work account):
  - Welcome message with buddy info, POD info
  - Links to policies, forms, payroll

#hr-onboarding thread:
  - "Rahul has joined today!" (green indicator)

HR gets Slack DM:
  - "Rahul has joined today!
     Please update status to Joined in Slack List."
```

**Who gets notified:**

| Person | Slack Message |
|--------|--------------|
| Everyone in #general | Welcome post |
| Joinee | Welcome DM with all links |
| HR | "Mark as Joined" reminder |

---

### D+2 (2 days after joining)

If HR hasn't updated the Slack List status to **"Joined"**, the bot sends a reminder:

> "Rahul joined 2 days ago. Status is still Confirmed.
> Please update to Joined."

**Who gets notified:** HR only

---

## The Onboarding Checklist (35 items)

After D-1, an **interactive checklist** appears in the #hr-onboarding thread. HR can click checkboxes directly in Slack.

### Pre-Joining (D-1) — 10 items
- Welcome email sent (auto-checked)
- Handbook email sent (auto-checked)
- Pre-read material shared (Employee Handbook and Plum Handbook)
- Employee Policy acknowledgement form shared
- Buddy notified (auto-checked)
- POD Leader notified (auto-checked)
- Work email created in Google Admin
- Slack invite sent
- Added to Slack channels
- Added to WhatsApp group

### Day 0 (Joining Day) — 6 items
- Workstation allocated + assets handed over
- Welcome kit given
- Biometric and face scan registered
- 2FA set up on work email
- LinkedIn status updated
- Razorpay link shared

### Documents — 6 items
- Employee contract signed and scanned
- Offer letter signed and scanned
- Relieving letter collected
- Bank details set up on Razorpay
- Employee self-uploaded docs on Razorpay
- Policy acknowledgment form signed

### Payroll — 4 items
- PF account details collected
- UAN created (200 OT + 1800 PF)
- PT + PF deductions explained
- Salary category confirmed

### Induction — 9 items
- HR welcome session done
- Office tour by buddy
- Team introduction (Saturday meet)
- Votex introduced
- Key policies walkthrough
- POD introduction + handshake with POD leader
- Induction meeting with Pushpal
- Role added in RMS
- Welcome post on Slack/LinkedIn

**When HR checks certain items, the joinee gets a Slack DM automatically:**
- Workstation allocated --> Joinee gets "Your workstation has been allocated"
- Welcome kit given --> Joinee gets "Your welcome kit is ready!"
- 2FA set up --> Joinee gets "2FA has been set up on your work email"
- And 9 more items that notify the joinee

---

## Slack Commands (Use Anytime)

| Command | What it does |
|---------|-------------|
| `/checklist Rahul Sharma` | Shows checklist with progress bar and done/pending items |
| `/onboard Rahul Sharma` | Shows full onboarding status overview |
| `/upcoming` | Shows all joiners in the next 7 days with readiness % |

---

## POD Leader Handshake Flow

```
D-1: Bot DMs POD Leader
     "New POD member Rahul -- let me know
      a suitable time for a handshake"
            |
            v
POD Leader replies to the bot DM
     "Thursday 2 PM works"
            |
            v
Bot automatically forwards to HR
     "Smit Patel replied about Rahul:
      Thursday 2 PM works"
```

HR does not need to relay messages — the bot handles it.

---

## What to Do When Things Change

### Joining date changes

1. Update the date in the Slack List
2. Toggle Status (change away from Confirmed, then back to Confirmed)
3. Bot syncs the new date
4. New emails will be sent on D-1 of the **new** date (old emails are not re-sent)

### Joiner gets rejected / cancelled

1. Change Status to **"Rejected"** or **"Cancelled"** in the Slack List
2. Bot ignores non-Confirmed entries — no emails, no messages

### Missing buddy or POD leader after confirming

1. Fill in the missing field in the Slack List
2. Toggle Status to re-sync
3. Bot picks up the update and stops alerting about missing fields

### Someone joins but was never in the system

Contact the dev team to trigger onboarding manually.

---

## Email Summary

| Email | Sent To | Contains |
|-------|---------|----------|
| Welcome + Credentials | Personal email | Office address, reporting date with day, time, buddy, POD, work email, temp password, work mode, onboarding lunch note, payroll + Slack links, document upload form |
| Handbook + Policies | Work email | 8 policy documents (Asset, Referral, Separation, Leave, POSH, Reimbursement, WFH, Plum Health Insurance), acknowledgment form |
| Buddy Notification | Buddy's work email | Joinee details, 9-point buddy responsibilities |
| POD Leader Notification | POD Leader's work email | Joinee details, handshake meeting request |

---

## Weekly Summary (Every Monday)

Every Monday at 10:30 AM, the bot posts in #hr-onboarding:

> **Weekly Onboarding Summary**
> This week: 3 joiner(s)
> Fully onboarded: 1
> Pending items: 2 joiner(s)
>   - Rahul Sharma — 12 items remaining
>   - Priya Patel — 5 items remaining

---

## Quick Reference Card

| When | What | Who Gets Notified |
|------|------|-------------------|
| Status = Confirmed | Data syncs to bot | -- |
| D-7 | Validation check | HR |
| D-6 to D-2 | Daily reminders if fields missing | HR |
| D-3 | Progress reminder | HR |
| D-1 | 4 emails + Slack DMs + checklist | Joinee, Buddy, POD Leader, HR |
| D-0 | Welcome in #general + DMs | Joinee, HR, #general |
| D+2 | Follow-up if not marked Joined | HR |
| Every Monday | Weekly summary | #hr-onboarding |

---

## Contact

For any issues with the bot, contact the dev team.
