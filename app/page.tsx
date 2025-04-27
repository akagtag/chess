import ChessGame from "@/components/chess-game"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <h1 className="mb-6 text-3xl font-bold text-center">Chess Game</h1>
      <ChessGame />
    </main>
  )
}
