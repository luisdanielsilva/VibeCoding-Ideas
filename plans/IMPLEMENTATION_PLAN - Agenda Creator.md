# Agenda Creator - Implementation Plan

**Version:** 1.0  
**Date:** May 2026  
**Status:** Initial Planning  

## 1. Project Overview

Agenda Creator is an intelligent automation tool that eliminates the manual back-and-forth of scheduling meetings and workshops.  

It collects topics, gathers availability and priorities from participants, finds the optimal time slot (respecting constraints like office days, hybrid preferences, and total time), and automatically sends fully organized calendar invites with the final agenda.

**Core Value Proposition:**  
Turn a messy list of topics + conflicting calendars into a perfectly scheduled, high-value workshop with zero manual coordination.

## 2. Goals & Objectives

- Reduce meeting scheduling time by **≥80%**
- Maximize attendance for high-priority topics
- Support both small team meetings and large cross-functional workshops
- Provide a delightful, low-friction user experience
- Be email-first but also support direct web/app usage

## 3. Key Features

### Phase 1 – MVP (Minimum Viable Product)
- Organizer creates a new workshop (name, description, optional Excel upload)
- Automatic email invitations to participants
- Participant portal (one-click link) to:
  - Submit availability (date/time ranges)
  - Select & prioritize topics
- Smart scheduling engine (finds best common time or best alternative)
- Automatic final agenda + calendar event emails (ICS attachment)
- Basic dashboard for organizer

### Phase 2 – Enhanced Features
- Recurring workshops / series
- Hybrid / office-day optimization
- Topic dependencies (e.g., Topic B should only happen after Topic A)
- AI-assisted topic clustering and agenda building
- Integration with Google Workspace & Microsoft 365 (Calendar + Gmail/Outlook)
- Slack/Teams notifications
- Analytics (time saved, attendance rate, topic coverage)

### Phase 3 – Advanced / Enterprise
- Team & organization workspaces
- Role-based permissions (admin, organizer, participant)
- Custom branding & email templates
- SSO / SCIM
- Audit logs & compliance reports
- API for enterprise integrations

## 4. Technical Architecture

- **Frontend:** Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Next.js API Routes or separate NestJS service (if needed for complex scheduling)
- **Database:** PostgreSQL (with Prisma ORM)
- **Authentication:** NextAuth.js (support Google, Microsoft, email magic links)
- **Scheduling Engine:** Custom constraint solver (or OR-Tools / PuLP via Python microservice if very complex)
- **Email Service:** Resend or Postmark (with transactional templates + ICS attachments)
- **Calendar Integration:** Google Calendar API + Microsoft Graph API
- **File Handling:** Excel parsing with `xlsx` library
- **Hosting:** Vercel (frontend + API) + Railway/Supabase for DB

## 5. Data Models (Core)

```prisma
model Workshop {
  id            String   @id @default(cuid())
  title         String
  description   String?
  organizerId   String
  status        WorkshopStatus @default(DRAFT)
  topics        Topic[]
  participants  Participant[]
  createdAt     DateTime @default(now())
  scheduledDate DateTime?
}

model Topic {
  id          String   @id @default(cuid())
  workshopId  String
  title       String
  description String?
  priority    Int?     // set by participants
  order       Int?
}

model Participant {
  id            String   @id @default(cuid())
  workshopId    String
  userId        String?
  email         String
  availability  Json     // array of time ranges
  topicPriorities Json   // topicId → priority
  respondedAt   DateTime?
}