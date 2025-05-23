import { BH2e } from "./module/config.js";
import { BH2eState } from "./module/bh2e_state.js";
import BH2eItemSheet from "./module/sheets/BH2eItemSheet.js";
import BH2eCharacterSheet from "./module/sheets/BH2eCharacterSheet.js";
import BH2eCreatureSheet from "./module/sheets/BH2eCreatureSheet.js";

async function preloadHandlebarsTemplates() {
  const paths = [
    "systems/17thcmin/templates/partials/ability-details.hbs",
    "systems/17thcmin/templates/partials/ability-entry.hbs",
    "systems/17thcmin/templates/partials/armour-details.hbs",
    "systems/17thcmin/templates/partials/armour-entry.hbs",
    "systems/17thcmin/templates/partials/attribute-details.hbs",
    "systems/17thcmin/templates/partials/attribute-list.hbs",
    "systems/17thcmin/templates/partials/creature-ability-entry.hbs",
    "systems/17thcmin/templates/partials/creature-attack-entry.hbs",
    "systems/17thcmin/templates/partials/equipment-entry.hbs",
    "systems/17thcmin/templates/partials/prayer-entry.hbs",
    "systems/17thcmin/templates/partials/spell-entry.hbs",
    "systems/17thcmin/templates/partials/toggle-collapse-widget.hbs",
    "systems/17thcmin/templates/partials/weapon-details.hbs",
    "systems/17thcmin/templates/partials/weapon-entry.hbs",
  ];
  return loadTemplates(paths);
}

Hooks.once("init", function () {
  console.log("Initializing the 17thcmin Black Hack 2e System.");

  CONFIG.bh2e = { configuration: BH2e, state: new BH2eState() };

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
});
