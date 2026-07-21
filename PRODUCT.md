# Product

## Register

product

## Platform

web

## Users

~30-50 friends (Mert included, as both operator and a participant) who follow the UEFA Champions League and know each other personally — this is not a public product for strangers. They use the site in two distinct modes: frequent, quick phone checks (leaderboard after a matchday, chat/forum banter, checking where they stand) and occasional sit-down desktop sessions (filling in the round-1 ranking or round-2 bracket, reading through stats). Both are real, ongoing usage patterns for the full 2026-27 season, not a one-time visit.

## Product Purpose

A from-scratch home for this specific friend group's Champions League prediction pool: submit a round-1 league-phase ranking and a round-2 knockout bracket, get scored automatically against real results, and follow a single running leaderboard, plus a chat and forum for banter alongside it. Success looks like the group actually using it end-to-end across the season — checking in during matchdays, arguing in chat, caring who's on top — not just a one-time submission form.

## Positioning

The friend group's own dedicated home for UCL prediction bragging rights: real functionality, real 2026-27 data, and a genuine two-device experience — not a generic sports-prediction template, and not a repeat of the previous edition's mobile-first-then-squished-for-desktop approach.

## Brand Personality

Sleek and competitive. The personality should come through the design system itself — color, type, motion, the weight of the leaderboard and stats — rather than through marketing-style copy or persuasive sections, since this is a tool people return to, not a page that needs to convince anyone of anything.

## Anti-references

The previous "#kupatakip" edition's desktop layout: built mobile-first and then horizontally stretched/squished to fill a desktop viewport, rather than genuinely designed for it. This edition should give mobile and desktop each a real, distinct layout. Also avoid gamification bloat (badges, streaks, achievement flourishes) — the scoring system deliberately stays to plain points and rank with no tiebreakers, and confetti is reserved for the actual season winner, not routine interactions; the visual language should match that restraint rather than undercut it with decorative game-ification.

## Design Principles

- **Two real layouts, not one stretched one.** Mobile and desktop are designed independently for their own context (quick glance vs. sit-down session); nothing gets there by horizontally squishing the other.
- **Personality lives in the system, not in copy.** Sleek/competitive comes from color, type, and motion choices applied consistently, not from hero sections or persuasive language — this is a product register, not a marketing one.
- **Restraint earns the payoff.** No badges, streaks, or decorative gamification; the leaderboard stays plain numbers and rank so the one deliberate spectacle (public winner confetti) actually reads as special.
- **Built for people who already know it, not strangers who need convincing.** No onboarding-style persuasion; get straight to functional clarity and trust for a closed, known group.
- **Specificity over placeholder tone.** Real teams, real fixtures, real dates already ground the app (`src/predictions/teams.ts`, `src/devpanel/fixtures.ts`) — the visual design should feel calibrated to that same specificity, not generic sports-app boilerplate.

## Accessibility & Inclusion

Standard good practice: WCAG AA-level contrast, full keyboard navigation. No specific accommodation needs identified for this closed friend-group audience.
