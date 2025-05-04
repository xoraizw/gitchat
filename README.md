# GitChat

Chat with any GitHub repository using AI. This application allows you to analyze GitHub repositories and have intelligent conversations about their codebase using Google's Gemini 1.5 AI model.

## Features

* 🤖 AI-powered code analysis
* 💬 Interactive chat interface
* 🎨 Modern, responsive design
* 🌙 Dark mode interface
* 📱 Mobile-friendly

## Tech Stack

* **Next.js 14**
* **TypeScript**
* **Tailwind CSS**
* **Google Gemini 1.5**
* **shadcn/ui** components

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/xoraizw/gitchat.git
cd gitchat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
GOOGLE_API_KEY=your_google_api_key_here
NEXT_PUBLIC_GOOGLE_API_KEY=${GOOGLE_API_KEY}
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The following environment variables need to be set in your `.env.local` file:

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Your Google API key for Gemini 1.5 |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Same as `GOOGLE_API_KEY`, exposed to the client-side |

## Project Structure

```
gitchat/
├── app/              # Next.js app directory
├── components/       # React components
│   └── ui/          # UI components from shadcn/ui
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configurations
└── public/          # Static assets
```

## Deployment

This app is deployed on Vercel. To deploy your own instance:

1. Fork this repository
2. Create a Vercel account if you don't have one
3. Import the repository to Vercel
4. Add the environment variables in your Vercel project settings
5. Deploy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes. 