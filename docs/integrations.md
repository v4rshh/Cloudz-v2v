# SafeSphere — Integration & Dress Rehearsal Guide

This guide details the end-to-end structure of the integrated safety systems inside **SafeSphere**, listing all API routes, client controllers, database schemas, and a step-by-step dress rehearsal pitch narrative for hackathon judging.

---

## 🛠️ 1. API Route Directory

All backend services are unified as serverless handlers inside the Next.js App Router. If Supabase Postgres database keys are absent, all handlers fallback cleanly to pre-seeded mock utilities.

| API Route | HTTP Method | Client Controller | Description | Offline Fallback |
| :--- | :--- | :--- | :--- | :--- |
| `/api/sos` | `POST` | `EmergencySOS.tsx` | Creates a new SOS event and sends Twilio SMS alerts to responders. | Stubs event ID, bypasses Twilio, and logs alert to console. |
| `/api/sos/[id]` | `GET` / `PATCH` | `track/[id]/page.tsx` | GET: Fetches active SOS tracker trail.<br>PATCH: Streams GPS coordinate updates. | Serves simulated Rotterdam Centraal coordinate trail. |
| `/api/sos/resolve` | `POST` | `EmergencySOS.tsx` | Deactivates and resolves an active SOS alert. | Updates local event state to resolved. |
| `/api/ghostcall` | `POST` | `GhostCall.tsx` | Queries the **Groq LLM** to generate situational excuse conversation scripts. | Returns a randomized clip excuse preset. |
| `/api/reports` | `POST` / `GET` | `IncidentReporter.tsx` | POST: Classifies hazard text using regex/NLP.<br>GET: Fetches all approved incidents. | Classifies content via local tokenizer; loads pre-seeded Rotterdam logs. |
| `/api/navigation/route`| `POST` | `SafetyMap.tsx` | Fetches route alternatives from Mapbox and scores them against incidents. | Calculates distances via Mapbox/OSRM; returns mock safety scores. |
| `/api/vibe-tags` | `POST` / `GET` | `SafetyMap.tsx` | POST: Records vibe tag coordinate pins.<br>GET: Fetches all vibe tag markers. | Saves tag to client array; returns Rotterdam pre-seeded markers. |

---

## 📞 2. Twilio SMS SOS Integration

```
[EmergencySOS Component] -> POST /api/sos -> [Twilio Message API] -> [Responder Contact Phone]
                                                 | (If credentials missing)
                                                 v
                                        [Mock Server Logs]
```

*   **SMS Generation**: Dispatched on `/api/sos`. It normalizes input numbers to E.164, builds the tracking link (`/track/[eventId]`), and coordinates GPS bounds.
*   **Webcam Evidence Hub**: The dynamic client page **[`app/track/[id]/page.tsx`](file:///c:/Users/varsh/Downloads/Cloudz/Cloudz-v2v/app/track/%5Bid%5D/page.tsx)** subscribes to the event updates via Supabase Realtime (or dynamic PATCH polling offline) and renders the sender's live path on the map.

---

## 🎙️ 3. Groq-Powered GhostCall Excuse Simulation

*   **Excuses on-the-fly**: The backend handler **[`app/api/ghostcall/route.ts`](file:///c:/Users/varsh/Downloads/Cloudz/Cloudz-v2v/app/api/ghostcall/route.ts)** queries Groq Llama-3 with a prompt to write natural friend-to-friend dialogues (limited to 45 words) based on the user's situation.
*   **Web Audio Oscillators**: Programmatically synthesizes standard USA telephone ring frequencies (440Hz + 480Hz dialer) using `AudioContext` to loop keylessly on mobile browsers.
*   **Interactive TTS Playback**: When "Answer" is pressed, browser SpeechSynthesis vocalizes the Groq script. Tapping "Decline" or "End Call" terminates the overlay and cancels speech instantly to return the user to map navigation safely.

---

## 🚨 4. Anonymous Incident Classifier & Feed

*   **Incident Logging**: Users enter details anonymously. The backend route `/api/reports` evaluates text categories and maps locations.
*   **Verify / Dispute System**:
    *   Once loaded in the Community Feed, users can toggle Verify or Dispute.
    *   **Locking Algorithm**: Selecting one action locks the other (turning it transparent/disabled) and highlights the chosen button in glowing teal/rose.
    *   **Micro-Badges**: Floating `+1 Verified` or `-1 Disputed` badges fade in next to the score counter to show immediate feedback.
*   **Safety Routing Overlay**: Approved incident records feed into the Mapbox line scorer, causing segment lines to render green (safe), amber (caution), or red (high danger).

---

## 🎭 5. Dress Rehearsal Pitch Narrative

Run this sequence during the hackathon demonstration to showcase the full, connected ecosystem of SafeSphere:

### Act 1: Safe Navigation (VibeRoute Map)
1.  Open the portal. You are redirected straight to `/dashboard`.
2.  Search **Rotterdam Centraal** to **Erasmus University Rotterdam** in the navigation card under the map.
3.  Click **Get Route**. Mapbox renders candidate paths. Notice the color-coded safety segments (green/amber/red) computed on-the-fly.
4.  Toggle layers (Heatmap, Well-Lit, Foot Traffic) to highlight how SafeSphere overlays city metadata.

### Act 2: Preventative De-escalation (GhostCall)
1.  Describe the scenario: *"You are walking home and notice someone trailing you. You feel uncomfortable but want to avoid escalating conflict."*
2.  Double-tap **Simulate GhostCall** in the sidebar.
3.  A calling screen overlay slides up showing "Dad ❤️" calling. The device speaker rings.
4.  Tap **Answer**. Ticking call timers appear, and a simulated voice starts speaking an excuse generated by Groq: *"Hey, I just parked the car near the corner crossings. I can see you coming up the street. Keep walking, I'll wave to you in a second!"*
5.  Walk with the voice, and tap **End Call** once you feel safe.

### Act 3: Emergency Broadcast (ShadowStream SOS)
1.  Describe the scenario: *"The situation worsens; the trailing individual grabs your shoulder. You need immediate help."*
2.  Select **Emergency SOS** in the sidebar and click **PANIC SOS**.
3.  A 5-second countdown starts with loud siren pings.
4.  Once the countdown hits 0:
    *   The webcam evidence camera boots up.
    *   Twilio dispatches an SOS alert SMS message containing a tracking link to your responder contacts.
    *   Terminal displays the mock warning dispatch: `[SMS MOCK BYPASS] SOS Warning dispatched to responder contact (+31 6 12345678) with tracking link.`
5.  Open the tracking link generated inside the panel in a new tab. You will see a live, dynamically updated coordinates card tracing the sender's path in real time.
6.  Return to the dashboard, click **Resolve SOS**, and verify the emergency alert completes cleanly.
