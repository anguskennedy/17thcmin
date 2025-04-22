export function setupInitiativeBag() {
  const combat = game.combat;
  if (!combat) return;

  const pcs = combat.combatants.filter((c) => c.actor?.type === "character");
  const adversaries = combat.combatants.filter((c) => c.actor?.type === "npc");

  const bag = [];
  for (const c of pcs) {
    const actorClass = c.actor?.system?.className;
    bag.push(c.actorId);
    if (
      typeof actorClass === "string" &&
      actorClass.toLowerCase() === "illusionist"
    ) {
      bag.push(c.actorId); // Add a second token for Illusionist
    }
  }
  if (adversaries.length > 0) bag.push("adversaries");
  bag.push("neutral");

  bag.sort(() => Math.random() - 0.5);

  combat.setFlag("17thcmin", "initiativeBag", bag);
  combat.setFlag("17thcmin", "currentTurn", null);

  ui.notifications.info("Initiative bag shuffled.");

  // Show count and breakdown of tokens in chat
  const breakdown = bag
    .map((id) => {
      if (id === "neutral") return "🟡 Neutral";
      if (id === "adversaries") return "🔴 Adversaries";
      const actor = game.actors.get(id);
      return actor ? `🟢 ${actor.name}` : "❓ Unknown";
    })
    .join("<br>");

  ChatMessage.create({
    content: `<strong>Initiative Bag (${bag.length} tokens):</strong><br>${breakdown}`,
    whisper: ChatMessage.getWhisperRecipients("GM"), // Only whisper to GM
  });
}

export async function drawInitiativeToken() {
  const combat = game.combat;
  if (!combat) return;

  let bag = await combat.getFlag("17thcmin", "initiativeBag");
  if (!bag || bag.length === 0) {
    ui.notifications.warn("No tokens left. Start a new round.");
    return;
  }

  const drawn = bag.shift();
  await combat.setFlag("17thcmin", "initiativeBag", bag);

  if (drawn === "neutral") {
    ui.notifications.info("Neutral token drawn. Round ends.");
    await combat.setFlag("17thcmin", "currentTurn", null);
    return;
  }

  if (drawn === "adversaries") {
    await combat.setFlag("17thcmin", "currentTurn", "adversaries");
    ChatMessage.create({
      speaker: { alias: "Adversaries" },
      content: "<strong>Adversaries act!</strong> GM determines order.",
    });
    return;
  }

  const combatant = combat.combatants.find((c) => c.actorId === drawn);
  if (combatant) {
    await combat.setFlag("17thcmin", "currentTurn", drawn);
    ChatMessage.create({
      speaker: { alias: combatant.name },
      content: `<strong>${combatant.name}</strong>'s turn!`,
    });
  }
}
