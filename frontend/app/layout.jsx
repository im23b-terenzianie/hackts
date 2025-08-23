import './globals.css'

export const metadata = {
  title: 'WordBattle - Das ultimative 1v1 Vokabel-Duell',
  description: 'Eine interaktive Web-App für Vokabel-Duelle zwischen zwei Spielern',
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
