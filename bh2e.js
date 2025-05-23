import { BH2eActor } from "./module/documents/bh2e_actor.js";
import { BH2eItem } from "./module/documents/bh2e_item.js";

import { BH2e } from "./module/config.js";
import { BH2eState } from "./module/bh2e_state.js";
import BH2eItemSheet from "./module/sheets/BH2eItemSheet.js";
import BH2eCharacterSheet from "./module/sheets/BH2eCharacterSheet.js";
import BH2eCombat from "./module/bh2e_combat.js";
import BH2eCreatureSheet from "./module/sheets/BH2eCreatureSheet.js";
import { logDamageRoll } from "./module/chat_messages.js";
import { toggleAttributeTestDisplay } from "./module/shared.js";

import BH2eScene from "./module/bh2e_scene.js";
import * as InitiativeBag from "./module/initiative.js";

async function preloadHandlebarsTemplates() {
  const paths = [
    "systems/17thcmin/templates/partials/ability-details.hbs",
    "systems/17thcmin/templates/partials/ability-entry.hbs",
    "systems/17thcmin/templates/partials/armour-details.hbs",
    "systems/17thcmin/templates/partials/armour-entry.hbs",
    "systems/17thcmin/templates/partials/attribute-details.hbs",
    "systems/17thcmin/templates/partials/attribute-list.hbs",
    "systems/17thcmin/templates/partials/background-tab.hbs",
    "systems/17thcmin/templates/partials/basics-tab.hbs",
    "systems/17thcmin/templates/partials/creature-ability-entry.hbs",
    "systems/17thcmin/templates/partials/creature-attack-entry.hbs",
    "systems/17thcmin/templates/partials/equipment-entry.hbs",
    "systems/17thcmin/templates/partials/prayer-entry.hbs",
    "systems/17thcmin/templates/partials/prayers-tab.hbs",
    "systems/17thcmin/templates/partials/spell-entry.hbs",
    "systems/17thcmin/templates/partials/spells-tab.hbs",
    "systems/17thcmin/templates/partials/toggle-collapse-widget.hbs",
    "systems/17thcmin/templates/partials/weapon-details.hbs",
    "systems/17thcmin/templates/partials/weapon-entry.hbs",
    "systems/17thcmin/templates/messages/attack-roll.hbs",
    "systems/17thcmin/templates/messages/attribute-test.hbs",
    "systems/17thcmin/templates/messages/cast-magic.hbs",
    "systems/17thcmin/templates/messages/damage.hbs",
    "systems/17thcmin/templates/messages/damage-roll.hbs",
    "systems/17thcmin/templates/messages/roll.hbs",
  ];
  return loadTemplates(paths);
}

async function runMigrations() {
  console.log("Running migrations...");
  updateCreatureHitPoints(game.actors);
  updateCharacterCoins(game.actors);
}

async function updateCharacterCoins(actors) {
  actors.forEach((actor) => {
    if (actor.type === "character") {
      let coins = actor.system.coins;
      let update = false;

      console.log(`Checking if '${actor.name}' needs a coins update.`);
      if (!coins || !Number.isNumeric(coins)) {
        coins = coins ? parseInt(coins) : 0;
        update = true;
      }

      if (update) {
        console.log(`Updating coins for '${actor.name}'.`);
        actor.update({ system: { coins: coins } });
      }
    }
  });
}

async function updateCreatureHitPoints(actors) {
  actors.forEach((actor) => {
    if (actor.type === "creature") {
      let hitPoints = actor.system.hitPoints;

      console.log(`Checking if '${actor.name}' needs an update.`);
      if (!hitPoints) {
        hitPoints = 5;
      }

      if (Number.isNumeric(hitPoints)) {
        console.log(`Updating hit points for '${actor.name}'.`);
        actor.update({
          system: { hitPoints: { max: hitPoints, value: hitPoints } },
        });
      }
    }
  });
}

Hooks.once("init", function () {
  let state = new BH2eState();

  console.log("Initializing the 17thcmin Black Hack 2e System.");

  game.bh2e = { BH2eActor, BH2eItem };
  game.bh2e.initiative = InitiativeBag;

  CONFIG.BH2E = { configuration: BH2e, state: state };
  CONFIG.Actor.documentClass = BH2eActor;
  CONFIG.Combat.documentClass = BH2eCombat;
  CONFIG.Item.documentClass = BH2eItem;
  CONFIG.Scene.documentClass = BH2eScene;

  game.settings.register("bh2e", "randomizeCreatureHP", {
    config: true,
    default: false,
    hint: game.i18n.localize("bh2e.settings.options.randomizeHP.blurb"),
    name: game.i18n.localize("bh2e.settings.options.randomizeHP.title"),
    scope: "world",
    type: Boolean,
  });

  window.bh2e = { configuration: BH2e, state: state };

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("bh2e", BH2eItemSheet, { makeDefault: true });

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("bh2e", BH2eCharacterSheet, {
    makeDefault: true,
    types: ["character", "npc"],
  });
  Actors.registerSheet("bh2e", BH2eCreatureSheet, {
    makeDefault: true,
    types: ["creature"],
  });

  // Load templates.
  preloadHandlebarsTemplates();

  Handlebars.registerHelper("attackKind", function (key) {
    return game.i18n.localize(`bh2e.weapons.kinds.${key}`);
  });
  Handlebars.registerHelper("longAttributeName", function (key) {
    return game.i18n.localize(`bh2e.fields.labels.attributes.${key}.long`);
  });
  Handlebars.registerHelper("rangeName", function (name) {
    return game.i18n.localize(`bh2e.ranges.${name}`);
  });
  Handlebars.registerHelper("shortAttributeName", function (key) {
    return game.i18n.localize(`bh2e.fields.labels.attributes.${key}.short`);
  });

  // Add hook functions.
  Hooks.on("renderChatMessage", (message, speaker) => {
    setTimeout(() => {
      let element = document.querySelector(`[data-message-id="${message.id}"]`);
      let node = element.querySelector(".bh2e-roll-title");

      if (node) {
        node.addEventListener("click", toggleAttributeTestDisplay);
      }

      node = element.querySelector(".bh2e-damage-button");
      if (node) {
        node.addEventListener("click", logDamageRoll);
      }
    }, 250);
  });
});

Hooks.on("renderCombatTracker", (app, html, data) => {
  const header = html.find(".combat-tracker-header");

  // Remove old if re-rendered
  html.find(".bh2e-init-buttons").remove();

  // Create button group
  const buttonGroup = $(`
    <div class="bh2e-init-buttons" style="margin-top: 5px;">
      <button type="button" class="bh2e-init-shuffle"><i class="fas fa-random"></i> Shuffle</button>
      <button type="button" class="bh2e-init-draw"><i class="fas fa-dice"></i> Draw</button>
    </div>
  `);

  buttonGroup.find(".bh2e-init-shuffle").click(() => {
    game.bh2e.initiative.setupInitiativeBag();
  });

  buttonGroup.find(".bh2e-init-draw").click(() => {
    game.bh2e.initiative.drawInitiativeToken();
  });

  header.after(buttonGroup);
});
