# OpenRouter AI Testing

This workspace is set up for testing OpenRouter AI models.

## Setup

1. Place your OpenRouter API key in the `.env` file:
   ```
   VITE_OPENROUTER_API_KEY=your-openrouter-api-key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   The chat app will be available at http://localhost:5173/

## Chat Agent

The project includes a ready-to-use chat agent built with React and Vite. It features:
- A minimalist UI inspired by Microsoft Copilot
- Real-time chat with OpenRouter
- Uses the low-cost `google/gemini-2.5-flash-lite` model by default
- Soft gradient backgrounds with rose-gold accents
- Rounded chat bubbles

## API Usage

To use OpenRouter models directly, use the following curl command structure:

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "HTTP-Referer: https://your-site.com" \
  -H "X-OpenRouter-Title: Your Site Name" \
  -H "Content-Type: application/json" \
  -d '{"model": "google/gemini-2.5-flash-lite", "messages": [{"role": "user", "content": [{"type": "text", "text": "Your message here"}]}]}'
```

Replace `YOUR_API_KEY` with your actual OpenRouter API key.

## Testing

Run the `test_requesty.bat` script to test the OpenRouter API connection.

## Copilot Instructions

The `.github/copilot-instructions.md` file contains custom instructions for GitHub Copilot in this workspace.