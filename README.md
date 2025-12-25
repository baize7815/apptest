
# Universal Batch Flow

A professional, provider-agnostic workflow tool for batch image processing. It automates the "Vision Analysis -> Image Generation" loop using universal API standards.

**Features:**
- 🚀 **Universal Compatibility**: Works with OpenRouter, SiliconFlow, OpenAI, or any provider supporting standard `/chat/completions` and `/images/generations` endpoints.
- 🔒 **Privacy First**: API keys and configurations are stored locally in your browser (`localStorage`). No keys are sent to our servers.
- ⚡ **Batch Processing**: Drag & drop folders or multiple images to process them in queue.
- 📥 **One-Click Download**: Automatically handles cross-origin downloads for generated images.

## 🛠️ Quick Start (Local)

1.  **Clone & Install**
    ```bash
    git clone [your-repo-url]
    cd universal-batch-flow
    npm install
    ```

2.  **Run Dev Server**
    ```bash
    npm run dev
    ```

3.  **Configure**
    - Open the app in your browser (usually `http://localhost:5173`).
    - Click the **Settings (Gear Icon)**.
    - Enter your API Base URL and Key (e.g., from OpenRouter or SiliconFlow).
    - **No `.env` file required!**

## ☁️ Deployment

### Vercel (Recommended)
This project is a static React app and is perfectly optimized for Vercel.

1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Keep the default Build settings (`vite build`).
4. **Deploy!** (No environment variables needed in Vercel dashboard).

## 🔧 Technical Details

- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS
- **State**: Local React State + LocalStorage persistence
- **API Client**: Native `fetch` (No SDK dependencies)

## License
MIT
