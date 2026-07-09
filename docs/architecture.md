# SafeRoute AI — Architecture Overview

```
[Mobile App - React Native]
        |
        | REST/GraphQL + WebSocket
        v
[API Gateway / Backend - Node.js + Express]
        |
   -------------------------------------------------
   |            |              |                   |
[Auth Svc] [Navigation Svc] [Reporting Svc]   [SOS Svc]
                   |              |                   |
             [Risk ML Svc]  [NLP Classifier]   [Notification Svc]
             (ai-services)   (ai-services)     (Twilio/FCM)
                   |              |
                   v              v
          [PostGIS DB]    [Vector DB + PostgreSQL]
                                  ^
                                  |
                        [RAG Pipeline: Retriever + LLM]
                        (ai-services/rag)
                                  |
                     [Knowledge Base: Laws, Helplines,
                      NGO docs, Procedures]
```

## Services

| Service | Location | Responsibility |
|---|---|---|
| Backend API | `backend/` | Auth, request routing, notification dispatch, DB writes |
| AI Services | `ai-services/` | RAG assistant, incident classification, risk scoring, anomaly detection |
| Mobile App | `mobile-app/` | User-facing UI: navigation, SOS, chat, reporting |

## Key Data Flows

1. **Navigation**: Mobile app → Backend `/api/navigation/route` → AI Services `/risk/score-routes` → scored routes returned
2. **Incident Report**: Mobile app → Backend `/api/reports` → AI Services `/classify/incident` → DB write (category/severity attached)
3. **RAG Chat**: Mobile app → Backend `/api/chat/ask` → AI Services `/rag/ask` (retrieval + LLM) → cited answer returned
4. **SOS**: Mobile app → Backend `/api/sos/trigger` → Notification Service (Twilio) → emergency contacts alerted

See the main requirements document (`SafeRoute_AI_Requirements.md`) for full functional/non-functional requirements and the AI/ML pipeline design in detail.
