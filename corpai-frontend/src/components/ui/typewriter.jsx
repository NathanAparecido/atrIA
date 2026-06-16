import { useEffect, useState } from "react"

/**
 * Typewriter — digita, apaga, avança para a próxima palavra.
 * Com stopAtLast=true, congela na última palavra sem apagar.
 * highlightFrom define a partir de qual índice de char aplicar highlightColor
 * (só na última palavra, quando congelada).
 *
 * cursorColor: quando definido, o cursor deixa de herdar o gradiente do
 * highlight (background-clip: text) e é pintado com cor sólida.
 * -webkit-text-fill-color precisa ser sobrescrito porque o pai
 * (.footer-text-glow / .footer-iris-text) seta transparent e a propriedade
 * é herdada — sem isso a cor sólida nunca aparece.
 */
export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 1800,
  cursor = true,
  cursorChar = "|",
  cursorColor = null,   // ex.: "#ffffff" — null mantém o comportamento antigo (herda gradiente)
  stopAtLast = false,
  highlightFrom = -1,   // char index a partir do qual colorir (última palavra)
  highlightColor = "#0d00ff",
  lastWordClassName = "",
  highlightClassName = "",
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

  // Cursor — pisca permanentemente (também depois do freeze).
  // Com cursorColor: cor sólida, sobrescrevendo o text-fill transparente
  // herdado dos wrappers com background-clip: text.
  // Sem cursorColor: comportamento antigo (herda gradiente do span pai).
  const cursorEl = cursor && (
    <span
      className="ml-[0.05em] transition-opacity duration-75"
      style={{
        opacity: showCursor ? 1 : 0,
        ...(cursorColor
          ? { color: cursorColor, WebkitTextFillColor: cursorColor }
          : {}),
      }}
    >
      {cursorChar}
    </span>
  )

  // Renderiza com destaque na última palavra (durante digitação e quando congelado).
  // O cursor continua DENTRO do span do highlight para manter o espaçamento
  // colado ao último caractere — a cor sólida (quando cursorColor é passado)
  // vence o gradiente via -webkit-text-fill-color no próprio cursor.
  const renderText = () => {
    const wrap = (children) =>
      isLastWord && lastWordClassName
        ? <span className={lastWordClassName}>{children}</span>
        : children

    if (isLastWord && highlightFrom >= 0 && displayText.length > highlightFrom) {
      return wrap(
        <>
          {displayText.substring(0, highlightFrom)}
          <span
            className={highlightClassName}
            style={highlightClassName ? undefined : { color: highlightColor }}
          >
            {displayText.substring(highlightFrom)}
            {cursorEl}
          </span>
        </>
      )
    }
    return (
      <>
        {wrap(displayText)}
        {cursorEl}
      </>
    )
  }

  return (
    <span className="inline-block">
      {renderText()}
    </span>
  )
}
