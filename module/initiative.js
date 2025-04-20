export function setupInitiativeBag() {
  const combat = game.combat;
  if (!combat) return;

  const pcs = combat.combatants.filter((c) => c.actor?.type === "character");
  const adversaries = combat.combatants.filter((c) => c.actor?.type === "npc");

  const bag = pcs.map((c) => c.actorId);
  if (adversaries.length > 0) bag.push("adversaries");
  bag.push("neutral");

  bag.sort(() => Math.random() - 0.5);

  combat.setFlag("17thcmin", "initiativeBag", bag);
  combat.setFlag("17thcmin", "currentTurn", null);

  ui.notifications.info("Initiative bag shuffled.");
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
