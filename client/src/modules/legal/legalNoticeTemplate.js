// ============================================================
// File:        legalNoticeTemplate.js
// Path:        client/src/modules/legal/legalNoticeTemplate.js
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: THE ONE HOME of the two legal-page templates the Dev Screen's "Insert template"
//              buttons fill in (sections/LegalPagesSection.jsx): the legal notice and, beside it,
//              the privacy policy. English and country-neutral, by the owner's decisions of
//              2026-10-18: many operators in different countries run the game, so each template
//              names the usual details in brackets and tells the operator to check which apply
//              where they operate. Each operator's own details are operator data, entered on their
//              install; nothing here is shipped as anyone's notice or policy.
//
//              The texts are kept VERBATIM, line breaks included — the legal pages show them as
//              plain text with their line breaks.
//
//              ★ THE PRIVACY POLICY IS DERIVED FROM docs/PRIVACY-FACTS.md and must stay in step
//              with it: every factual sentence (the 30-day session cookie, no IP addresses stored
//              by the app, no access log, player names kept permanently in stored races, names
//              registered through a link kept until the registration is deleted and its one
//              device-marker cookie (REGISTRATION-1), what the browser stores, the daily GitHub
//              release check) states what that page states.
//              When the facts change, both change in the same commit.
// ============================================================

export const LEGAL_NOTICE_TEMPLATE = `LEGAL NOTICE

Operator
[Full name or company name]
[Street and number]
[Postcode and city]
[Country]

Contact
Email: [contact@your-domain]
Phone: [optional]

[ONLY IF YOU RUN THIS AS A BUSINESS - otherwise delete this section]
Company register: [register court / number]
VAT ID: [number]
Responsible for the content: [name, address]
[END OF SECTION]


About this service
Seasonal Race is a browser-based race simulation for entertainment at
events and in communities. No money is staked and no winnings are paid out.


Source code
Seasonal Race is free software, licensed under the GNU AGPL-3.0-or-later.
The complete source code of the running version is available through the
"Source code" link on the start page.


Liability for content and links
The content of this service is prepared with care, but no guarantee is
given for its accuracy, completeness or timeliness. The operators of linked
external sites are solely responsible for their content; no legal
violations were apparent when the links were set.


Copyright
Unless stated otherwise, the texts and graphics of this service belong to
the operator or are used with permission. Use outside this service
requires the operator's consent.


Note for operators (delete before publishing): which details a legal
notice must contain depends on the country you operate from - some
countries require one, others do not. Check what applies to you.`;

export const PRIVACY_POLICY_TEMPLATE = `PRIVACY POLICY

Who is responsible
The operator named in the Legal Notice of this service is responsible for
the personal data processed here.
Contact: [contact@your-domain]


What this service is
Seasonal Race is a browser-based race simulation for entertainment at
events and in communities. Viewers do not need an account. Only race
directors sign in.


What data is processed

1. Visiting the service
When you open this service, your browser connects to our server. Like any
web server, it necessarily receives your IP address and the usual technical
details of the request in order to deliver the page. The application itself
does not record IP addresses and keeps no access log of who opened which
page. [IF YOUR HOSTING OR PROXY KEEPS ACCESS LOGS: describe them here -
what is logged, for how long, and by whom. Otherwise delete this sentence.]

2. Race director accounts
For race directors who sign in, we store a user name, team, role and a
securely hashed password (never the password itself). Signing in sets one
technically necessary session cookie, valid for up to 30 days. It is used
only to keep you signed in. No IP address or browser details are stored
with the session.

3. Player names in races
Race directors enter the names of the players who take part in a race, and
may save them in player groups. Players have no account. Finished races are
stored with the players' names, finishing order and times, and are kept
permanently as a record of the results. Player groups are kept until a race
director deletes them.
Players may also register themselves through a link the race director
shares; their names are kept with the registration until the organiser
deletes it, and registering sets one technically necessary cookie per
registration that only marks this device as already registered.
[If you do not want real names stored, use nicknames.]

4. Data stored in your browser
The service stores some settings, the list of recent races and, while you
are signed in, your user name in your browser's local storage. This data
stays on your device and can be removed by clearing this site's data in
your browser.

5. Backups
To protect against data loss, the operator makes backups of the server's
data, which contain the data described above. [Describe how long backups
are kept, e.g. "Backups are deleted after 14 days."]


What we do not do
- No analytics, tracking or advertising.
- No external fonts, scripts or embedded third-party content.
- No sale or sharing of personal data with third parties.


Who else is involved
- Hosting: the service runs on a server provided by [hosting provider,
  country]. The provider processes data only as needed to run the server.
- Update check: when an administrator opens the settings, the server may
  ask GitHub (GitHub, Inc.) once a day whether a new version exists. This
  request contains no personal data of visitors or players.


Purpose and legal basis
We process this data only to run the races and to keep their results. Where
a legal basis is required, this is the operator's legitimate interest in
providing the service, and for race directors the use of the account they
asked for. [Adjust to the law that applies to you.]


Your rights
Depending on the law that applies to you, you may have the right to ask
what data about you is stored, and to have it corrected, restricted or
deleted, and to complain to a data protection authority. To do so, contact
us at the address above.
Please note: a name in a finished race is part of a permanent results
record and cannot be removed in the application itself. If you have a
concern, contact us and we will look for a solution.


Changes
We may update this policy when the service changes. The current version is
always available on this page.

Last updated: [date]


Note for operators (delete before publishing): which details a privacy
policy must contain depends on the country you operate from and where your
visitors are. Check what applies to you, fill in the bracketed parts, and
remove anything that does not match your installation.`;
