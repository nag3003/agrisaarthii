# AgriSarathi - AI-Powered Farming Assistant

AgriSarathi is an intelligent agricultural platform designed to empower farmers with real-time data, AI-driven advice, and essential tools for modern farming.

## Features

- **AI Voice Assistant (Jarvis)**: Ask questions about crops, weather, and market prices in your local language.
- **Crop Doctor**: Diagnose crop diseases by uploading photos.
- **Market Prices**: Live updates on commodity prices from nearby mandis.
- **Weather Forecast**: Hyper-local weather updates and alerts.
- **Smart Tools**: Calculators for fertilizers, seeds, and more.
- **Community & Jobs**: Find agricultural labor and connect with other farmers.

## Tech Stack

- **Frontend**: React Native (Expo) for Mobile & Web
- **Backend**: Python (FastAPI)
- **AI**: Groq (Llama 3), Google Gemini
- **Database**: Firebase (Firestore)
- **Hosting**: Vercel / Serveo (for development tunnels)

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.10+
- Expo CLI

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/agrisarathi.git
    cd agrisarathi
    ```

2.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm start
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python -m app.main
    ```

## Deployment

The frontend is configured to deploy to GitHub Pages.

### Enabling GitHub Pages (One-Time Setup)

If you see a 404 error after deployment, you need to enable GitHub Pages in your repository settings:

1.  Go to your repository on GitHub: [https://github.com/nag3003/agrisaarthii](https://github.com/nag3003/agrisaarthii)
2.  Click on **Settings** (top right tab).
3.  In the left sidebar, scroll down and click on **Pages**.
4.  Under **Build and deployment** > **Source**, ensure **Deploy from a branch** is selected.
5.  Under **Branch**, select **gh-pages** from the dropdown menu and ensure the folder is **/(root)**.
6.  Click **Save**.
7.  Wait 1-2 minutes, then refresh [https://nag3003.github.io/agrisaarthii](https://nag3003.github.io/agrisaarthii).

The backend requires a Python environment (e.g., Render, Railway, or AWS).
For local development, use the provided Serveo tunnels.

## License

MIT
