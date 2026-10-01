export function formatCountdown(
  seconds
) {
  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
        60
    );

  const secs =
    seconds % 60;

  return [
    hours,
    minutes,
    secs,
  ]
    .map(
      (value) =>
        String(value)
          .padStart(
            2,
            "0"
          )
    )
    .join(":");
}

export function minerDisplayName(
  miner
) {
  if (!miner) {
    return "YOUR SOAPY";
  }

  return (
    miner.name ||
    `Soapy #${miner.tokenId}`
  );
}
