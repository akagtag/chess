import ChessGame from "@/components/chess-game"

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 w-full max-w-6xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Play against the computer
        </p>
        <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Chess Game</h1>
      </div>
      <ChessGame />
    </main>
  )
}