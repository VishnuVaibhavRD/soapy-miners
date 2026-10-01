export async function requestRewardMineAttackSignature({
  mineId,
  tokenId,
  player,
}) {
  const response =
    await fetch(
      "/api/reward-mine/attack-signature",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            mineId,
            tokenId,
            player,
          }),
      }
    );


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Failed to prepare attack."
    );
  }


  return data;
}
