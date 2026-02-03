# PHASE 2 – SYSTEM ARCHITECTURE

## 1. Tech Stack Selection & Justification

### Frontend: React Native (with Expo)
*   **Justification**:
    *   **Hermes Engine**: Optimized for low-end Android devices (faster startup, lower memory usage).
    *   **OTA Updates**: Expo Updates allows pushing critical bug fixes without forcing users to re-download the APK (bandwidth saving).
    *   **Cross-Platform**: Single codebase for potential future iOS expansion, though Android is priority.
    *   **Offline Support**: Robust ecosystem (SQLite, MMKV) for caching data for offline access.

### Backend: Python (FastAPI)
*   **Justification**:
    *   **Async/Await**: Crucial for handling concurrent long-running AI requests (Speech-to-Text, LLM generation) without blocking the server.
    *   **AI Ecosystem**: Native integration with PyTorch, LangChain, and OpenAI SDKs.
    *   **Performance**: One of the fastest Python frameworks, essential for minimizing latency.

### Database: PostgreSQL + pgvector & Redis
*   **Justification**:
    *   **PostgreSQL**: Rock-solid relational data (User profiles, crop history, mandi data).
    *   **pgvector**: Enables Vector Search for RAG (Retrieval Augmented Generation) directly within the main DB, avoiding complexity of a separate Vector DB.
    *   **Redis**: High-speed caching for Weather and Mandi prices to prevent hitting external APIs repeatedly (cost & latency reduction).

### AI Services (The "Brain")
*   **ASR (Speech-to-Text)**: **OpenAI Whisper (API)** via Azure/OpenAI (High accuracy for Indian accents/dialects).
*   **Translation**: **Sarvam AI** or **Google Translate API** (Specialized for Indic languages).
*   **LLM**: **GPT-4o-mini** (Best balance of intelligence, speed, and cost for reasoning).
*   **TTS (Text-to-Speech)**: **Google Cloud TTS** or **Azure AI Speech** (Natural sounding vernacular voices).
*   **Image Recognition**: **GPT-4o Vision** (Multi-modal analysis for crop disease).

### Infrastructure
*   **Cloud**: AWS (EC2/ECS for backend, S3 for media storage).
*   **CDN**: CloudFront (to serve static assets and cached audio fast).

---

## 2. High-Level Architecture

```mermaid
graph TD
    User[Farmer (Low-end Android)] -->|Voice/Image/Tap| App[React Native App]
    
    subgraph "On-Device (Offline First)"
        App -->|Cache Read/Write| LocalDB[SQLite/MMKV]
        App -->|Queue Requests| JobQueue[Background Sync]
    end
    
    App -->|HTTPS/REST| API_Gateway[API Gateway / Nginx]
    
    subgraph "Backend (FastAPI Cluster)"
        API_Gateway --> AuthSvc[Auth Service]
        API_Gateway --> AdvisorySvc[Advisory Service]
        API_Gateway --> UtilitySvc[Weather/Market Service]
        
        AdvisorySvc -->|Orchestrate| LangChain[LangChain Agent]
    end
    
    subgraph "Data Layer"
        AuthSvc --> DB[(PostgreSQL + pgvector)]
        UtilitySvc --> Redis[(Redis Cache)]
        AdvisorySvc --> S3[AWS S3 (Media Storage)]
    end
    
    subgraph "External AI & Data Services"
        LangChain -->|Audio| Whisper[ASR Service]
        LangChain -->|Text| LLM[GPT-4o-mini]
        LangChain -->|Text| TTS[TTS Service]
        UtilitySvc -->|Fetch| IMD[Weather API]
        UtilitySvc -->|Fetch| eNAM[Mandi Prices API]
    end
```

**Data Flow:**
1.  **Voice Query**: App records audio -> Compresses -> Sends to API.
2.  **Processing**: API uploads to S3 -> Whisper (Audio to Text) -> LLM (Reasoning + RAG from DB) -> TTS (Response Text to Audio).
3.  **Response**: API returns Audio URL + Text. App plays audio and caches it.

---

## 3. API Endpoints

### Authentication
*   `POST /api/v1/auth/login-otp`
    *   **Purpose**: Send OTP to mobile number.
*   `POST /api/v1/auth/verify-otp`
    *   **Purpose**: Exchange OTP for JWT Access/Refresh tokens.

### Advisory (Voice & Vision)
*   `POST /api/v1/advisory/query/voice`
    *   **Purpose**: Upload audio blob. Returns `{ query_text, response_text, audio_url, recommended_actions }`.
    *   **Input**: `multipart/form-data` (audio file).
*   `POST /api/v1/advisory/query/text`
    *   **Purpose**: Fallback text input.
*   `POST /api/v1/advisory/diagnosis`
    *   **Purpose**: Upload crop image. Returns diagnosis, remedy, and audio explanation.
    *   **Input**: `multipart/form-data` (image file).

### Utilities
*   `GET /api/v1/weather`
    *   **Purpose**: Get 3-day forecast for user's registered lat/long. (Cached in Redis for 3 hours).
*   `GET /api/v1/market/prices`
    *   **Purpose**: Get crop prices. Query params: `crop_name`, `district`. (Cached in Redis for 24 hours).
*   `GET /api/v1/schemes/eligible`
    *   **Purpose**: Get list of eligible schemes based on user profile.

### User & Offline Sync
*   `GET /api/v1/user/profile`
    *   **Purpose**: Get user details (Language, Location, Crops).
*   `POST /api/v1/user/profile`
    *   **Purpose**: Update profile.
*   `POST /api/v1/sync/history`
    *   **Purpose**: Batch upload local logs/history when internet restores.

---

## 4. Performance & Scalability Risks

### 1. Latency Accumulation (The "5-second" wall)
*   **Risk**: ASR (1s) + LLM (2s) + TTS (1s) + Network (2s) = 6s+. This feels slow.
*   **Mitigation**:
    *   **Streaming**: Stream text-to-speech chunks to the client immediately as the LLM generates tokens.
    *   **Optimistic UI**: Show "Listening..." -> "Thinking..." animations.
    *   **Caching**: Cache common Q&A (e.g., "Tomato price today") to serve instantly without hitting AI.

### 2. Poor Connectivity (Packet Loss)
*   **Risk**: Audio upload fails mid-way on 2G.
*   **Mitigation**:
    *   **Compression**: Use aggressive audio compression (Opus/AAC at low bitrates) before upload.
    *   **Resumable Uploads**: Tus protocol or chunked uploads for larger files (images).
    *   **Retry Logic**: Exponential backoff on the client side.

### 3. Cost Escalation
*   **Risk**: High usage of GPT-4o and TTS APIs can burn budget.
*   **Mitigation**:
    *   **Rate Limiting**: Strict limits per user.
    *   **Model Routing**: Use cheaper models (e.g., Llama 3 8B hosted) for simple queries ("What is the weather?"), reserve GPT-4o for complex diagnosis.
