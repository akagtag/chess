"use client"

import { useState, useEffect, useCallback } from "react"
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs } from "react-chessboard"
import { Chess } from "chess.js"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, RotateCcw, Trophy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

type Difficulty = "easy" | "medium" | "hard"

export default function ChessGame() {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(game.fen())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [gameStatus, setGameStatus] = useState<string>("")
  const [isThinking, setIsThinking] = useState(false)
  const { theme, setTheme } = useTheme()
  const [whiteTime, setWhiteTime] = useState(600) // 10 minutes in seconds
  const [blackTime, setBlackTime] = useState(600)
  const [timerActive, setTimerActive] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<number[]>([0])
  const [evaluation, setEvaluation] = useState(0)

  const evaluatePosition = useCallback(() => {
    // Simple material evaluation
    let score = 0
    const board = game.board()

    // Piece values
    const pieceValues = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    }

    // Count material
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j]
        if (piece) {
          const value = pieceValues[piece.type as keyof typeof pieceValues]
          if (piece.color === "w") {
            score += value
          } else {
            score -= value
          }
        }
      }
    }

    // Add positional factors
    const moves = game.moves().length
    if (game.turn() === "w") {
      score += moves * 0.1 // Mobility bonus
    } else {
      score -= moves * 0.1
    }

    // Check bonus
    if (game.isCheck()) {
      if (game.turn() === "w") {
        score -= 0.5
      } else {
        score += 0.5
      }
    }

    // Update evaluation and score history
    setEvaluation(score)
    setScoreHistory((prev) => [...prev, score])

    return score
  }, [game])

  const updateGameState = useCallback(() => {
    setFen(game.fen())

    // Update move history
    const history = game.history({ verbose: false })
    setMoveHistory(history)

    // Evaluate position
    evaluatePosition()

    // Start timer if not already active
    if (!timerActive && moveHistory.length > 0) {
      setTimerActive(true)
    }

    // Check game status
    if (game.isGameOver()) {
      setTimerActive(false)
      if (game.isCheckmate()) {
        setGameStatus(`Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`)
      } else if (game.isDraw()) {
        setGameStatus("Game ended in a draw!")
      } else if (game.isStalemate()) {
        setGameStatus("Stalemate!")
      } else if (game.isThreefoldRepetition()) {
        setGameStatus("Draw by threefold repetition!")
      } else if (game.isInsufficientMaterial()) {
        setGameStatus("Draw by insufficient material!")
      }
    } else if (game.isCheck()) {
      setGameStatus(`${game.turn() === "w" ? "White" : "Black"} is in check!`)
    } else {
      setGameStatus(`${game.turn() === "w" ? "White" : "Black"} to move`)
    }
  }, [game, evaluatePosition, timerActive, moveHistory.length])

  const makeRandomMove = useCallback(() => {
    if (game.isGameOver() || isThinking) return

    setIsThinking(true)

    // Simulate "thinking" time based on difficulty
    const thinkingTime = difficulty === "easy" ? 500 : difficulty === "medium" ? 1000 : 1500

    setTimeout(() => {
      const possibleMoves = game.moves()

      if (possibleMoves.length > 0) {
        let move

        if (difficulty === "easy") {
          // Easy: completely random moves
          const randomIndex = Math.floor(Math.random() * possibleMoves.length)
          move = possibleMoves[randomIndex]
        } else if (difficulty === "medium") {
          // Medium: slightly smarter - prioritize captures and checks
          const captureMoves = possibleMoves.filter((move) => move.includes("x"))
          const checkMoves = possibleMoves.filter((move) => move.includes("+"))

          if (checkMoves.length > 0 && Math.random() > 0.3) {
            const randomIndex = Math.floor(Math.random() * checkMoves.length)
            move = checkMoves[randomIndex]
          } else if (captureMoves.length > 0 && Math.random() > 0.5) {
            const randomIndex = Math.floor(Math.random() * captureMoves.length)
            move = captureMoves[randomIndex]
          } else {
            const randomIndex = Math.floor(Math.random() * possibleMoves.length)
            move = possibleMoves[randomIndex]
          }
        } else {
          // Hard: evaluate positions and make better moves
          // This is a simplified evaluation - a real chess engine would be much more sophisticated
          let bestMove = null
          let bestScore = Number.NEGATIVE_INFINITY

          for (const moveStr of possibleMoves) {
            const gameCopy = new Chess(game.fen())
            gameCopy.move(moveStr)

            // Simple evaluation: material count + position
            let score = 0

            // Material count
            const board = gameCopy.board()
            for (let i = 0; i < 8; i++) {
              for (let j = 0; j < 8; j++) {
                const piece = board[i][j]
                if (piece) {
                  const value =
                    piece.type === "p"
                      ? 1
                      : piece.type === "n"
                        ? 3
                        : piece.type === "b"
                          ? 3
                          : piece.type === "r"
                            ? 5
                            : piece.type === "q"
                              ? 9
                              : piece.type === "k"
                                ? 0
                                : 0

                  if (piece.color === (playerColor === "white" ? "b" : "w")) {
                    score += value
                  } else {
                    score -= value
                  }
                }
              }
            }

            // Bonus for center control
            const centerMoves =
              gameCopy.moves({ square: "d4" }).length +
              gameCopy.moves({ square: "d5" }).length +
              gameCopy.moves({ square: "e4" }).length +
              gameCopy.moves({ square: "e5" }).length
            score += centerMoves * 0.1

            // Bonus for checks
            if (gameCopy.isCheck()) {
              score += 0.5
            }

            // Bonus for checkmate
            if (gameCopy.isCheckmate()) {
              score += 100
            }

            if (score > bestScore) {
              bestScore = score
              bestMove = moveStr
            }
          }

          move = bestMove || possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
        }

        game.move(move)
        updateGameState()
      }

      setIsThinking(false)
    }, thinkingTime)
  }, [game, difficulty, isThinking, playerColor, updateGameState])

  // Make bot move if it's the bot's turn
  useEffect(() => {
    const currentTurn = game.turn() === "w" ? "white" : "black"
    if (currentTurn !== playerColor && !game.isGameOver()) {
      const timer = setTimeout(() => {
        makeRandomMove()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [game, playerColor, makeRandomMove])

  // Initialize game
  useEffect(() => {
    updateGameState()
  }, [updateGameState])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerActive && !game.isGameOver()) {
      interval = setInterval(() => {
        if (game.turn() === "w") {
          setWhiteTime((prev) => {
            if (prev <= 0) {
              clearInterval(interval!)
              setGameStatus("Black wins on time!")
              return 0
            }
            return prev - 1
          })
        } else {
          setBlackTime((prev) => {
            if (prev <= 0) {
              clearInterval(interval!)
              setGameStatus("White wins on time!")
              return 0
            }
            return prev - 1
          })
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerActive, game])

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!sourceSquare || !targetSquare) {
      return false
    }

    // Check if it's player's turn
    const currentTurn = game.turn() === "w" ? "white" : "black"
    if (currentTurn !== playerColor || game.isGameOver()) {
      return false
    }

    try {
      // Make the move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for simplicity
      })

      // If move is invalid
      if (move === null) return false

      // Update game state
      updateGameState()

      return true
    } catch (e) {
      return false
    }
  }, [game, playerColor, updateGameState])

  const chessboardOptions: ChessboardOptions = {
    position: fen,
    onPieceDrop: onDrop,
    boardOrientation: playerColor,
    allowDrawingArrows: true,
    boardStyle: {
      borderRadius: "0.75rem",
      boxShadow: "0 18px 45px -24px hsl(var(--foreground) / 0.45)",
    },
  }
  const resetGame = () => {
    const newGame = new Chess()
    setGame(newGame)
    setFen(newGame.fen())
    setMoveHistory([])
    setGameStatus(`${playerColor === "white" ? "White" : "Black"} to move`)
    setWhiteTime(600)
    setBlackTime(600)
    setTimerActive(false)
    setScoreHistory([0])
    setEvaluation(0)

    // If bot goes first, make a move
    if (playerColor === "black") {
      setTimeout(() => {
        const possibleMoves = newGame.moves()
        if (possibleMoves.length > 0) {
          const randomIndex = Math.floor(Math.random() * possibleMoves.length)
          newGame.move(possibleMoves[randomIndex])
          setFen(newGame.fen())
          updateGameState()
        }
      }, 500)
    }
  }

  const changeDifficulty = (value: string) => {
    setDifficulty(value as Difficulty)
  }

  const changePlayerColor = (value: string) => {
    setPlayerColor(value as "white" | "black")
    resetGame()
  }

  // Format move history into pairs for display
  const formattedMoveHistory = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    formattedMoveHistory.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1] || "",
    })
  }

  return (
    <div className="grid w-full max-w-6xl min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="difficulty" className="text-sm font-medium">
              Bot Difficulty
            </label>
            <Select value={difficulty} onValueChange={changeDifficulty}>
              <SelectTrigger id="difficulty" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="color" className="text-sm font-medium">
              Play as
            </label>
            <Select value={playerColor} onValueChange={changePlayerColor}>
              <SelectTrigger id="color" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex gap-2 sm:ml-auto sm:col-span-1">
            <Button onClick={resetGame} className="min-w-0 flex-1 sm:flex-none" variant="outline">
              <RotateCcw className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">New Game</span>
            </Button>
            <Button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              variant="outline"
              size="icon"
              className="self-end"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[600px]">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/30 p-1 shadow-sm sm:p-2">
            <Chessboard options={chessboardOptions} />
          </div>
          {isThinking && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-md">
              Bot is thinking...
            </div>
          )}
        </div>

        {gameStatus && (
          <Alert variant={game.isGameOver() ? "default" : undefined}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {game.isGameOver() ? (
                <span className="flex items-center">
                  Game Over <Trophy className="ml-2 h-4 w-4 text-yellow-500" />
                </span>
              ) : (
                "Game Status"
              )}
            </AlertTitle>
            <AlertDescription>{gameStatus}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="min-w-0 w-full">
        <Tabs defaultValue="moves">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="moves">Move History</TabsTrigger>
            <TabsTrigger value="info">Game Info</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="moves">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Moves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">#</th>
                        <th className="text-left">White</th>
                        <th className="text-left">Black</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formattedMoveHistory.length > 0 ? (
                        formattedMoveHistory.map((move) => (
                          <tr key={move.number} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2">{move.number}.</td>
                            <td className="py-2">{move.white}</td>
                            <td className="py-2">{move.black}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-500">
                            No moves yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Player</h3>
                  <Badge variant="outline" className="text-sm">
                    Playing as {playerColor === "white" ? "White ♙" : "Black ♟"}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-medium mb-1">Bot Difficulty</h3>
                  <Badge
                    variant="outline"
                    className={`text-sm ${
                      difficulty === "easy"
                        ? "bg-green-100 dark:bg-green-900"
                        : difficulty === "medium"
                          ? "bg-yellow-100 dark:bg-yellow-900"
                          : "bg-red-100 dark:bg-red-900"
                    }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-medium mb-1">Difficulty Levels</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>
                      <span className="font-medium">Easy:</span> Makes random moves
                    </li>
                    <li>
                      <span className="font-medium">Medium:</span> Prioritizes captures and checks
                    </li>
                    <li>
                      <span className="font-medium">Hard:</span> Evaluates positions and makes strategic moves
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-1">Controls</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Drag and drop pieces to make moves</li>
                    <li>Click "New Game" to restart</li>
                    <li>Change difficulty or color at any time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Timers</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-md">
                      <div className="text-sm mb-1">White</div>
                      <div className="text-xl font-mono">
                        {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <div className="p-3 border rounded-md">
                      <div className="text-sm mb-1">Black</div>
                      <div className="text-xl font-mono">
                        {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Evaluation</h3>
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                    <div
                      className={`h-full ${evaluation > 0 ? "bg-blue-500" : "bg-black dark:bg-gray-900"}`}
                      style={{
                        width: `${50 + Math.min(Math.max(evaluation * 5, -50), 50)}%`,
                        transition: "width 0.3s ease-in-out",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span>Black</span>
                    <span>{evaluation.toFixed(1)}</span>
                    <span>White</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Score History</h3>
                  <div className="h-32 border rounded-md p-2">
                    <div className="relative h-full w-full">
                      <div className="absolute inset-0">
                        <div className="h-px w-full bg-gray-300 dark:bg-gray-600 absolute top-1/2 transform -translate-y-1/2" />
                        {scoreHistory.map((score, index) => {
                          const x = (index / Math.max(1, scoreHistory.length - 1)) * 100
                          const y = 50 - Math.min(Math.max(score * 5, -50), 50)
                          return index > 0 ? (
                            <div
                              key={index}
                              className="absolute h-1 w-1 bg-blue-500 rounded-full"
                              style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          ) : null
                        })}
                        {scoreHistory.length > 1 && (
                          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                            <polyline
                              points={scoreHistory
                                .map((score, index) => {
                                  const x = (index / (scoreHistory.length - 1)) * 100
                                  const y = 50 - Math.min(Math.max(score * 5, -50), 50)
                                  return `${x},${y}`
                                })
                                .join(" ")}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1"
                              className="text-blue-500"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
