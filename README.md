# Techno Vaidhya - Virtual Medical Assistant

Techno Vaidhya is a futuristic AI-powered medical chatbot that serves as a virtual doctor, providing basic medical information and guidance to patients. The application uses the Gemini API to power its conversational capabilities.

## Features

- **Dark Futuristic Theme**: Modern UI with a cyber/medical aesthetic
- **User Authentication**: Secure login and registration system
- **Medical Chatbot**: AI-powered conversations about health concerns
- **Session Management**: Persistent chat sessions
- **Responsive Design**: Works on both desktop and mobile devices

## Technologies Used

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Gemini API**: Google's generative AI model
- **JSON DB**: Simple JSON files for data storage
- **JWT**: Token-based authentication

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- NPM or Yarn

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
techno-vidya/
├── public/             # Static files
├── src/                # Source code
│   ├── app/            # App routes and layout
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   └── data/           # JSON database files
├── .env                # Environment variables
└── README.md           # Project documentation
```

## Usage

1. Create an account or log in
2. Start a conversation with the AI assistant
3. Ask health-related questions and receive AI-generated responses

## Limitations

- This is a demo application and should not replace professional medical advice
- The AI assistant is trained on general data and may not have up-to-date medical information
- All data is stored locally in JSON files, not suitable for production use

## License

MIT
