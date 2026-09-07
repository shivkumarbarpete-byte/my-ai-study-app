import './globals.css';

export const metadata = {
  title: 'AI Study Assistant',
  description: 'Generate interactive flashcards and quizzes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}