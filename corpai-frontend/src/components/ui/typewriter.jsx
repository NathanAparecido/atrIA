import { useEffect, useState } from "react"

/**
 * Typewriter — digita, apaga, avança para a próxima palavra.
 * Com stopAtLast=true, congela na última palavra sem apagar.
 * highlightFrom define a partir de qual índice de char aplicar highlightColor
 * (só na última palavra, quando congelada).
 */
export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 1800,
  cursor = true,
  cursorChar = "|",
  stopAtLast = false,
  highlightFrom = -1,   // char index a partir do qual colorir (última palavra)
  highlightColor = "#0d00ff",
}) {
  const [displayText, setDisplayText]   = useState("")
  const [isDeleting, setIsDeleting]     = useState(false)
  const [wordIndex, setWordIndex]       = useState(0)
  const [charIndex, setCharIndex]       = useState(0)
  const [showCursor, setShowCursor]     = useState(true)
  const [frozen, setFrozen]             = useState(false)

  const currentWord = words[wordIndex]
  const isLastWord  = wordIndex === words.length - 1

  useEffect(() => {
    if (frozen) return

    const id = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentWord.length) {
          setDisplayText(currentWord.substring(0, charIndex + 1))
          setCharIndex(c => c + 1)
        } else {
          // palavra completa
          if (stopAtLast && isLastWord) {
            setFrozen(true)
            return
          }
          const pauseId = setTimeout(() => setIsDeleting(true), delayBetweenWords)
          return () => clearTimeout(pauseId)
        }
      } else {
        if (charIndex > 0) {
          setDisplayText(currentWord.substring(0, charIndex - 1))
          setCharIndex(c => c - 1)
        } else {
          setIsDeleting(false)
          setWordIndex(i => (i + 1) % words.length)
        }
      }
    }, isDeleting ? speed / 2 : speed)

    return () => clearTimeout(id)
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords,
      wordIndex, words, frozen, stopAtLast, isLastWord])

  // Piscar do cursor
  useEffect(() => {
    if (!cursor) return
    const id = setInterval(() => setShowCursor(v => !v), 500)
    return () => clearInterval(id)
  }, [cursor])

  // Renderiza com destaque + neon na última palavra (durante digitação e quando congelado)
  const renderText = () => {
    if (isLastWord && highlightFrom >= 0 && displayText.length > highlightFrom) {
      return (
        <>
          {displayText.substring(0, highlightFrom)}
          <span style={{
            color: highlightColor,
            filter: 'drop-shadow(0 0 28px rgba(60,100,210,0.9)) drop-shadow(0 0 12px rgba(90,140,230,0.55))',
            textShadow: '0 0 12px rgba(60,100,210,0.6)',
          }}>
            {displayText.substring(highlightFrom)}
          </span>
        </>
      )
    }
    return displayText
  }

  return (
    <span className="inline-block">
      {renderText()}
      {cursor && (
        <span
          className="ml-[0.05em] transition-opacity duration-75"
          style={{ opacity: showCursor ? 1 : 0 }}
        >
          {cursorChar}
        </span>
      )}
    </span>
  )
}
