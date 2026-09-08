export default function AnimatedBrandLogo() {
  const words = ["OTHER", "LIFE"];
  let letterIndex = 0;

  return (
    <span className="brand-wordmark" aria-hidden="true">
      <span className="brand-wordmark-text">
        {words.map((word) => (
          <span className="brand-wordmark-word" key={word}>
            {word.split("").map((letter) => {
              const index = letterIndex++;
              return (
                <span
                  className="brand-wordmark-letter"
                  key={`${word}-${index}`}
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  {letter}
                </span>
              );
            })}
          </span>
        ))}
      </span>
      <span className="brand-wordmark-mark">®</span>
    </span>
  );
}
