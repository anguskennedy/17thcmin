import AttackRollDialog from "../dialogs/attack_roll_dialog.js";
import InfoDialog from "../dialogs/info_dialog.js";
import {
  castMagic,
  castMagicAsRitual,
  prepareMagic,
  unprepareMagic,
} from "../magic.js";
import {
  deleteOwnedItem,
  findActorFromItemId,
  generateDieRollFormula,
  initializeCharacterSheetUI,
  interpolate,
  onTabSelected,
} from "../shared.js";
import {
  logAttackRoll,
  logAttributeTest,
  logUsageDieRoll,
} from "../chat_messages.js";

export default class BH2eCharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["bh2e", "sheet", "character", "npc"],
      height: 825,
      template: "systems/17thcmin/templates/sheets/character-sheet.html",
      width: 800,
    });
  }

  /** @override */
  get template() {
    return `systems/17thcmin/templates/sheets/character-sheet.html`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const actorData = context.actor.system;

    context.system = actorData;
    context.flags = context.actor.flags;

    if (context.actor.type === "character") {
      this._prepareCharacterData(context);
    }

    if (context.actor.type === "npc") {
      this._prepareCharacterData(context);
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    initializeCharacterSheetUI(window.bh2e.state);

    html.find(".roll-attributes").click((ev) => {
      ev.preventDefault();
      this._rollAttributes();
    });
    html
      .find(".bh2e-roll-attack-icon")
      .click(this._onRollAttackClicked.bind(this));
    html
      .find(".bh2e-roll-attribute-test-icon")
      .click(this._onRollAttributeTest.bind(this));
    html
      .find(".bh2e-roll-usage-die-icon")
      .click(this._onRollUsageDieClicked.bind(this));
    html
      .find(".bh2e-delete-item-icon")
      .click(this._onDeleteItemClicked.bind(this));
    html
      .find(".bh2e-break-armour-die-icon")
      .click(this._onBreakArmourDieClicked.bind(this));
    html
      .find(".bh2e-repair-armour-die-icon")
      .click(this._onRepairArmourDieClicked.bind(this));
    html
      .find(".bh2e-repair-all-armour-dice-icon")
      .click(this._onRepairAllArmourDiceClicked.bind(this));
    html.find(".short-rest-button").click(this._onShortRest.bind(this));
    html.find(".long-rest-button").click(this._onLongRest.bind(this));
    html
      .find(".bh2e-reset-all-usage-dice-icon")
      .click(this._onResetUsageDiceClicked.bind(this));
    html
      .find(".bh2e-reset-usage-die-icon")
      .click(this._onResetUsageDieClicked.bind(this));
    html
      .find(".bh2e-increase-quantity-icon")
      .click(this._onIncreaseEquipmentQuantityClicked.bind(this));
    html
      .find(".bh2e-decrease-quantity-icon")
      .click(this._onDecreaseEquipmentQuantityClicked.bind(this));
    html.find(".bh2e-cast-magic-icon").click(castMagic);
    html.find(".bh2e-cast-magic-as-ritual-icon").click(castMagicAsRitual);
    html.find(".bh2e-prepare-magic-icon").click(prepareMagic);
    html.find(".bh2e-unprepare-magic-icon").click(unprepareMagic);
    html
      .find(".bh2e-info-element")
      .click((e) =>
        InfoDialog.build(e.currentTarget).then((d) => d.render(true))
      );

    // Bit of a kludge to avoid underlying anchors being clicked where icons
    // have been set with click event handlers (issue #35).
    html.find(".bh2e-action-link").click((e) => {
      e.preventDefault();
      return false;
    });
  }

  _prepareCharacterData(context) {
    let abilities = [];
    let armour = [];
    let classes = [];
    let equipment = [];
    let prayers = [[], [], [], [], [], [], [], [], [], []];
    let spells = [[], [], [], [], [], [], [], [], [], []];
    let weapons = [];

    context.items.forEach((item) => {
      switch (item.type) {
        case "ability":
          abilities.push(item);
          break;

        case "armour":
          armour.push(item);
          break;

        case "class":
          classes.push(item);
          break;

        case "equipment":
          equipment.push(item);
          break;

        case "magic":
          let index = item.system.level - 1;

          if (index >= 0 && index < spells.length) {
            switch (item.system.kind) {
              case "prayer":
                prayers[index].push(item);
                break;

              case "spell":
                spells[index].push(item);
                break;

              default:
                console.warn("Ignoring character item magic", item);
            }
          } else {
            console.error(
              `An invalid level of ${item.system.level} was specified for a spell or prayer.`,
              item
            );
          }
          break;

        case "weapon":
          weapons.push({
            actorId: this.actor.id,
            attribute: item.system.attribute,
            description: item.system.description,
            id: item._id,
            kind: item.system.kind,
            name: item.name,
            rarity: item.system.rarity,
            size: item.system.size,
          });
          break;

        default:
          console.warn("Ignoring character item", item);
      }
    });

    abilities.sort(function (lhs, rhs) {
      if (lhs.name > rhs.name) {
        return 1;
      } else if (lhs.name < rhs.name) {
        return -1;
      } else {
        return 0;
      }
    });

    context.abilities = abilities;
    context.armour = armour;
    context.classes = classes;
    context.config = CONFIG.BH2E.configuration;
    context.equipment = equipment;
    context.hasPrayers1 = prayers[0].length > 0;
    context.hasPrayers2 = prayers[1].length > 0;
    context.hasPrayers3 = prayers[2].length > 0;
    context.hasPrayers4 = prayers[3].length > 0;
    context.hasPrayers5 = prayers[4].length > 0;
    context.hasPrayers6 = prayers[5].length > 0;
    context.hasPrayers7 = prayers[6].length > 0;
    context.hasPrayers8 = prayers[7].length > 0;
    context.hasPrayers9 = prayers[8].length > 0;
    context.hasPrayers10 = prayers[9].length > 0;
    context.hasSpells1 = spells[0].length > 0;
    context.hasSpells2 = spells[1].length > 0;
    context.hasSpells3 = spells[2].length > 0;
    context.hasSpells4 = spells[3].length > 0;
    context.hasSpells5 = spells[4].length > 0;
    context.hasSpells6 = spells[5].length > 0;
    context.hasSpells7 = spells[6].length > 0;
    context.hasSpells8 = spells[7].length > 0;
    context.hasSpells9 = spells[8].length > 0;
    context.hasSpells10 = spells[9].length > 0;
    context.prayers1 = prayers[0];
    context.prayers2 = prayers[1];
    context.prayers3 = prayers[2];
    context.prayers4 = prayers[3];
    context.prayers5 = prayers[4];
    context.prayers6 = prayers[5];
    context.prayers7 = prayers[6];
    context.prayers8 = prayers[7];
    context.prayers9 = prayers[8];
    context.prayers10 = prayers[9];
    context.spells1 = spells[0];
    context.spells2 = spells[1];
    context.spells3 = spells[2];
    context.spells4 = spells[3];
    context.spells5 = spells[4];
    context.spells6 = spells[5];
    context.spells7 = spells[6];
    context.spells8 = spells[7];
    context.spells9 = spells[8];
    context.spells10 = spells[9];
    context.weapons = weapons;
  }

  async _rollAttributes() {
    const actor = this.actor;
    const attributes = [
      "strength",
      "dexterity",
      "intelligence",
      "charisma",
      "luck",
    ];

    let updates = {};
    let finalResults = {};
    let summary = "<p><strong>Rolled Attributes:</strong></p><ul>";

    async function rollAttribute(attr) {
      let roll = new Roll("3d4");
      await roll.roll({ async: true });
      let result = roll.total;
      let detail = `3d4 → ${result}`;

      if (result < 6) {
        const reroll = new Roll("1d4 + 12");
        await reroll.roll({ async: true });
        result = reroll.total;
        detail += ` → rerolled with 1d4+12 → ${result}`;

        // Optional chat message for the reroll only
        reroll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          flavor: `Rerolled ${attr.toUpperCase()} (was < 6) with 1d4+12: ${result}`,
        });
      }

      return { result, detail };
    }

    // First round of rolling
    for (let attr of attributes) {
      const { result, detail } = await rollAttribute(attr);
      finalResults[attr] = result;
      summary += `<li>${
        attr.charAt(0).toUpperCase() + attr.slice(1)
      }: ${detail}</li>`;
    }

    // If all attributes are <= 10, reroll everything once
    if (Object.values(finalResults).every((val) => val <= 10)) {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: "No attribute exceeded 10. Rerolling all attributes...",
      });

      summary = "<p><strong>Rerolled All Attributes:</strong></p><ul>";
      for (let attr of attributes) {
        const { result, detail } = await rollAttribute(attr);
        finalResults[attr] = result;
        summary += `<li>${
          attr.charAt(0).toUpperCase() + attr.slice(1)
        }: ${detail}</li>`;
      }
    }

    summary += "</ul>";

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: summary,
    });

    for (let attr of attributes) {
      updates[`system.attributes.${attr}`] = finalResults[attr];
    }

    await actor.update(updates);
  }
  _onBreakArmourDieClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      console.log(
        `Breakage of armour die on armour item id ${element.dataset.id}.`
      );
      let actor = findActorFromItemId(element.dataset.id);
      if (actor) {
        let item = actor.items.find((i) => i.id === element.dataset.id);

        if (item) {
          if (item.system.armourValue.total > item.system.armourValue.broken) {
            let data = {
              system: {
                armourValue: { broken: item.system.armourValue.broken + 1 },
              },
            };
            item.update(data, { diff: true });
          }
        } else {
          console.error(`Failed to find item id ${element.dataset.id}.`);
        }
      } else {
        console.error(
          `Failed to find an actor that owns item id ${element.dataset.id}.`
        );
      }
    } else {
      console.error(`Element had no item id on it.`);
    }

    return false;
  }

  _onDeleteItemClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      deleteOwnedItem(element.dataset.id);
    } else {
      console.error(
        "Delete item called for but item id is not present on the element."
      );
    }
    return false;
  }

  _onDecreaseEquipmentQuantityClicked(evemt) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      let actor = findActorFromItemId(element.dataset.id);

      if (actor) {
        this.decrementEquipmentQuantity(actor, element.dataset.id);
      } else {
        console.error(
          `Failed to find an actor that owns item id ${element.dataset.id}.`
        );
      }
    } else {
      console.error(`Element had no item id on it.`);
    }
    return false;
  }

  _onIncreaseEquipmentQuantityClicked(evemt) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      let actor = findActorFromItemId(element.dataset.id);
      if (actor) {
        this.incrementEquipmentQuantity(actor, element.dataset.id);
      } else {
        console.error(
          `Failed to find an actor that owns item id ${element.dataset.id}.`
        );
      }
    } else {
      console.error(`Element had no item id on it.`);
    }
    return false;
  }

  _onRepairAllArmourDiceClicked(event) {
    let element = event.currentTarget;
    let actor = game.actors.find((a) => a.id === element.dataset.id);

    event.preventDefault();
    if (actor) {
      console.log("Repairing all armour dice for actor id ${actor.id}.");
      actor.items.forEach(function (item) {
        let data = { system: { armourValue: { broken: 0 } } };

        if (item.type === "armour") {
          if (item.system.armourValue.broken > 0) {
            item.update(data, { diff: true });
          }
        }
      });
    } else {
      console.error(
        `Failed to find an actor with the id ${element.dataset.id}.`
      );
    }
    return false;
  }

  _onRepairArmourDieClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    if (element.dataset.id) {
      console.log(
        `Repairing of armour die on armour item id ${element.dataset.id}.`
      );
      let actor = findActorFromItemId(element.dataset.id);
      if (actor) {
        let item = actor.items.find((i) => i.id === element.dataset.id);

        if (item) {
          if (item.system.armourValue.broken > 0) {
            let data = {
              system: {
                armourValue: { broken: item.system.armourValue.broken - 1 },
              },
            };
            item.update(data, { diff: true });
          }
        } else {
          console.error(`Failed to find item id ${element.dataset.id}.`);
        }
      } else {
        console.error(
          `Failed to find an actor that owns item id ${element.dataset.id}.`
        );
      }
    } else {
      console.error(`Element had no item id on it.`);
    }
    return false;
  }

  _onResetUsageDiceClicked(event) {
    let element = event.currentTarget;
    let actorId = element.dataset.id;

    event.preventDefault();
    if (actorId) {
      let actor = game.actors.find((a) => a.id === actorId);

      if (actor) {
        actor.items.forEach((item) => this.resetUsageDie(actor, item.id));
      } else {
        console.error(`Unable to locate an actor wth the id ${actorId}.`);
      }
    } else {
      console.error("Actor id not found in element data set.");
    }
    return false;
  }

  _onResetUsageDieClicked(event) {
    let element = event.currentTarget;
    let itemId = element.dataset.id;

    event.preventDefault();
    if (itemId) {
      let actor = findActorFromItemId(itemId);

      if (actor) {
        this.resetUsageDie(actor, itemId);
      } else {
        console.error(
          `Unable to locate an owning actor for item id ${itemId}.`
        );
      }
    } else {
      console.error("Equipment element does not possess an item id.");
    }
    return false;
  }

  _onRollAttackClicked(event) {
    let element = event.currentTarget;
    let actor = findActorFromItemId(element.dataset.id);

    event.preventDefault();
    if (!event.altKey) {
      logAttackRoll(actor.id, element.dataset.id, {
        advantage: event.shiftKey,
        disadvantage: event.ctrlKey,
      });
    } else {
      AttackRollDialog.build(event).then((dialog) => dialog.render(true));
    }

    return false;
  }

  _onRollAttributeTest(event) {
    let element = event.currentTarget;
    let actor = game.actors.find((a) => a.id === element.dataset.id);

    event.preventDefault();
    logAttributeTest(
      element.dataset.id,
      element.dataset.attribute,
      event.shiftKey,
      event.ctrlKey
    );
    return false;
  }

  _onRollUsageDieClicked(event) {
    let element = event.currentTarget;

    event.preventDefault();
    logUsageDieRoll(element.dataset.id);
    return false;
  }

  decrementEquipmentQuantity(actor, itemId) {
    let item = actor.items.find((i) => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.system;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        if (itemData.quantity > 0) {
          let data = { quantity: itemData.quantity - 1 };
          item.update({ system: data }, { diff: true });
        } else {
          console.warn(
            `Unable to decrease quantity for the ${item.name} item (id: ${item.id}) as it's already at zero.`
          );
        }
      } else {
        console.warn(
          `Unable to increase quantity for the ${item.name} item (id ${item.name}) (${item.id}) as it does not have a usage die.`
        );
      }
    } else {
      if (!item) {
        console.error(
          `The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`
        );
      }
    }
  }

  incrementEquipmentQuantity(actor, itemId) {
    let item = actor.items.find((i) => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.system;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        let data = { quantity: itemData.quantity + 1 };
        item.update({ system: data }, { diff: true });
      } else {
        console.warn(
          `Unable to increase quantity for item id ${item.name} (${item.id}) as it does not have a usage die.`
        );
      }
    } else {
      if (!item) {
        console.error(
          `The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`
        );
      }
    }
  }

  resetUsageDie(actor, itemId) {
    let item = actor.items.find((i) => i.id === itemId);

    if (item && item.type === "equipment") {
      let itemData = item.system;

      if (itemData.usageDie && itemData.usageDie.maximum !== "none") {
        if (itemData.quantity > 0) {
          if (itemData.usageDie.current !== itemData.usageDie.maximum) {
            let data = { usageDie: { current: itemData.usageDie.maximum } };
            item.update({ system: data }, { diff: true });
          } else {
            console.warn(
              `Unable to reset the usage die for item ${item.name} (id ${item.id}) as it's at it's maximum usage die.`
            );
          }
        } else {
          console.warn(
            `Unable to reset the usage die for item ${item.name} (id ${item.id}) as it's supply is depleted.`
          );
          ui.notifications.error(
            interpolate("bh2e.messages.errors.supplyDepleted", {
              item: item.name,
            })
          );
        }
      } else {
        console.warn(
          `Unable to reset the usage die for item id ${item.name} (${item.id}) as it does not have a usage die.`
        );
      }
    } else {
      if (!item) {
        console.error(
          `The actor '${actor.name}' (id ${actor.id}) does not appear to own item id ${itemId}.`
        );
      }
    }
  }
  _prepareNPCData(context) {
    let abilities = [];
    let armour = [];
    let weapons = [];

    context.items.forEach((item) => {
      switch (item.type) {
        case "ability":
          abilities.push(item);
          break;

        case "armour":
          armour.push(item);
          break;

        case "weapon":
          weapons.push({
            actorId: this.actor.id,
            attribute: item.system.attribute,
            description: item.system.description,
            id: item._id,
            kind: item.system.kind,
            name: item.name,
            rarity: item.system.rarity,
            size: item.system.size,
          });
          break;

        default:
          console.warn("Ignoring NPC item", item);
      }
    });

    //abilities.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
    abilities.sort((lhs, rhs) => lhs.sort - rhs.sort);

    context.abilities = abilities;
    context.armour = armour;
    context.weapons = weapons;
    context.config = CONFIG.BH2E.configuration;
  }
  async _onShortRest(event) {
    event.preventDefault();
    const actor = this.actor;

    if (!actor) {
      console.error("Short Rest failed: no actor found.");
      return;
    }

    const level = actor.system.level ?? 1;
    const hpGain = level;
    const newHp = Math.min(
      actor.system.hitPoints.max,
      actor.system.hitPoints.value + hpGain
    );

    await actor.update({ "system.hitPoints.value": newHp });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `${actor.name} takes a short rest and heals ${hpGain} HP.`,
    });
  }

  async _onLongRest(event) {
    event.preventDefault();
    const actor = this.actor;

    if (!actor) {
      console.error("Long Rest failed: no actor found.");
      return;
    }

    const maxHp = actor.system.hitPoints.max;

    await actor.update({ "system.hitPoints.value": maxHp });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `${actor.name} takes a long rest and fully restores HP to ${maxHp}.`,
    });
  }
}
