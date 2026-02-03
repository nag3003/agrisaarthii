# PHASE 1 – PRODUCT DEFINITION

## 1. Problem Statement
Rural Indian farmers suffer from low productivity and income due to a lack of timely, actionable, and personalized agricultural advice. Existing solutions are text-heavy, English/Hindi-centric (ignoring dialects), or require complex navigation, excluding millions of illiterate or semi-literate users who rely on low-end devices with poor connectivity.

## 2. Target Users
*   **Demographics**: Smallholder farmers in rural India (e.g., UP, Bihar, Maharashtra, Telangana).
*   **Literacy Level**: Low literacy to functional illiteracy. Comfortable with voice and video, struggling with typing or reading long text.
*   **Language**: Vernacular languages (Hindi, Marathi, Telugu, Tamil) and local dialects.
*   **Device Profile**: Entry-level Android smartphones (Android 8.1 Go to Android 11), 1GB-3GB RAM, limited storage.
*   **Connectivity**: Intermittent 4G, often falling back to 2G/3G; high sensitivity to data costs.

## 3. MVP Features (Max 6)
1.  **Voice-First Advisory (AgriBot)**: One-tap "Push-to-Talk" interface to ask questions in local language (e.g., "Why are my tomato leaves turning yellow?") with audio responses.
2.  **Visual Crop Doctor**: Photo capture of diseased crops -> AI identification -> Audio-based diagnosis and remedy.
3.  **Local Weather Forecast**: Audio-first weather updates (next 3 days) localized to the village level, focusing on rain and wind alerts.
4.  **Mandi (Market) Prices**: Voice search for current crop prices in nearby markets (e.g., "Price of onion in Nashik").
5.  **Government Scheme Scanner**: Voice-based discovery of eligible schemes based on farmer profile.
6.  **Offline Knowledge Pocket**: Automatic caching of recent queries, weather, and saved advisories for access without internet.

## 4. Out-of-Scope Features (MVP)
*   **E-commerce**: Buying/selling seeds, fertilizers, or produce.
*   **Social/Community Forums**: Chatting with other farmers (moderation complexity).
*   **Live Video Calls**: Connection to human experts (bandwidth/cost constraints).
*   **IoT Integration**: Connecting to soil sensors or smart irrigation systems.
*   **Digital Payments**: Wallets or UPI integration.
*   **Detailed Farm Management**: Inventory tracking, accounting, or payroll.

## 5. Success Metrics
*   **Adoption**: Number of successful voice queries per user per week.
*   **Utility**: "Helpful" rate on answers (Binary Thumbs Up/Down feedback).
*   **Performance**: Average latency from "Stop Recording" to "Start Audio Response" (Target: < 5s on 4G, < 10s on 3G).
*   **Retention**: Day-30 retention rate (users returning for advice).
*   **Error Rate**: % of failed speech-to-text recognitions requiring retry.
