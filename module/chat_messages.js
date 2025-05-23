import {
  findActorFromItemId,
  generateDieRollFormula,
  interpolate,
} from "./shared.js";

function isRollCritical(roll, options = {}) {
  let outcome = false;

  if (options.advantage) {
    outcome =
      roll.terms[0].results[0].result === 1 ||
      roll.terms[0].results[1].result === 1;
  } else if (options.disadvantage) {
    outcome =
      roll.terms[0].results[0].result === 1 &&
      roll.terms[0].results[1].result === 1;
  } else {
    outcome = roll.terms[0].results[0].result === 1;
  }

  return outcome;
}

function isRollFumble(roll, options = {}) {
  let outcome = false;

  if (options.advantage) {
    outcome =
      roll.terms[0].results[0].result === 20 ||
      roll.terms[0].results[1].result === 20;
  } else if (options.disadvantage) {
    outcome =
      roll.terms[0].results[0].result === 20 &&
      roll.terms[0].results[1].result === 20;
  } else {
    outcome = roll.terms[0].results[0].result === 20;
  }

  return outcome;
}

export function logAttackRoll(actorId, weaponId, options = {}) {
  let actor = game.actors.find((a) => a.id === actorId);

  if (actor) {
    let weapon = actor.items.find((i) => i.id === weaponId);

    if (weapon) {
      let roll = null;
      let extraDie = "";
      let critical = false;
      let fumble = false;
      let data = {
        actor: actor.name,
        actorId: actorId,
        weapon: weapon.name,
        weaponId: weapon.id,
      };
      let settings = {};

      if (options.advantage) {
        settings.kind = "advantage";
      } else if (options.disadvantage) {
        settings.kind = "disadvantage";
      }

      if (options.modifier) {
        settings.modifier = options.modifier;
      }

      roll = new Roll(`${generateDieRollFormula(settings)}${extraDie}`);
      roll.evaluate().then(() => {
        critical = isRollCritical(roll, options);
        fumble = isRollFumble(roll, options);
        data.roll = {
          formula: roll.formula,
          labels: { title: interpolate("bh2e.messages.titles.attackRoll") },
          result: roll.total,
          tested: true,
        };

        data.roll.success =
          actor.system.attributes[weapon.system.attribute] > data.roll.result;

        if (critical) {
          data.roll.labels.result = interpolate(
            "bh2e.messages.labels.critical"
          );
        } else if (fumble) {
          data.roll.labels.result = interpolate("bh2e.messages.labels.fumble");
        } else {
          data.roll.labels.result = interpolate(
            data.roll.success
              ? "bh2e.messages.labels.hit"
              : "bh2e.messages.labels.miss"
          );
        }

        if (data.roll.success) {
          let damageDie = null;

          if (weapon.system.kind === "unarmed") {
            damageDie = actor.system.damageDice.unarmed;
          } else {
            switch (weapon.system.size) {
              case "small":
                damageDie = "d4";
                break;
              case "big":
                damageDie = "d8";
                break;
              default:
                damageDie = "d6";
                break;
            }
          }

          if (damageDie !== "special") {
            data.damage = {
              actorId: actor.id,
              critical: critical,
              formula: `${generateDieRollFormula({
                dieType: damageDie,
              })}${extraDie}`,
              weapon: weapon.name,
              weaponId: weapon.id,
            };
          }
        }

        if (game.dice3d) {
          game.dice3d.showForRoll(roll);
        }
        showMessage(
          actor,
          "systems/17thcmin/templates/messages/attack-roll.hbs",
          data
        );
      });
    } else {
      console.error(
        `Unable to locate weapon id '${weaponId} on actor '${actor.name}'.`
      );
    }
  } else {
    console.error(`Unable to locate an actor with the id '${actorId}'.`);
  }
}

export function logAttributeTest(
  actorId,
  attribute,
  shiftKey = false,
  ctrlKey = false
) {
  let actor = game.actors.find((a) => a.id === actorId);

  if (actor) {
    let roll = null;
    let data = {
      actor: actor.name,
      actorId: actorId,
      attribute: interpolate(`bh2e.fields.labels.attributes.${attribute}.long`),
    };

    if (shiftKey) {
      roll = new Roll(generateDieRollFormula({ kind: "advantage" }));
    } else if (ctrlKey) {
      roll = new Roll(generateDieRollFormula({ kind: "disadvantage" }));
    } else {
      roll = new Roll(generateDieRollFormula());
    }
    roll.evaluate().then((roll) => {
      data.roll = {
        formula: roll.formula,
        labels: {
          title: interpolate("bh2e.messages.titles.attributeTest", {
            attribute: data.attribute,
          }),
        },
        result: roll.total,
        tested: true,
      };

      data.roll.success =
        actor.system.attributes[attribute] >= data.roll.result;
      data.roll.labels.result = interpolate(
        data.roll.success
          ? "bh2e.messages.labels.success"
          : "bh2e.messages.labels.failure"
      );
      if (game.dice3d) {
        game.dice3d.showForRoll(roll);
      }

      showMessage(
        actor,
        "systems/17thcmin/templates/messages/attribute-test.hbs",
        data
      );
    });
  } else {
    console.error(`Unable to locate an actor with the id '${actorId}'.`);
  }
}

export function logDamageRoll(event) {
  let element = event.currentTarget;
  let rollData = element.dataset;

  if (rollData.formula && rollData.actor) {
    let actor = game.actors.find((a) => a.id === rollData.actor);
    let data = {
      roll: {
        labels: { title: interpolate("bh2e.messages.titles.damageRoll") },
        tested: false,
      },
    };
    let formula = rollData.formula;
    let roll = null;

    if (rollData.critical === "true") {
      formula = `(${formula})+1d4`;
    }
    data.roll.formula = formula;

    roll = new Roll(formula);
    roll.evaluate().then(() => {
      data.roll.result = roll.total;
      if (game.dice3d) {
        game.dice3d.showForRoll(roll);
      }
      showMessage(
        actor,
        "systems/17thcmin/templates/messages/damage-roll.hbs",
        data
      );
    });
  } else {
    console.error(
      "Damage roll requested but requesting element did not have a damage formula attribute."
    );
  }

  return false;
}

export function logUsageDieRoll(itemId) {
  let actor = findActorFromItemId(itemId);

  if (actor) {
    let item = actor.items.find((i) => i.id === itemId);

    if (item) {
      let usageDie = item.system.usageDie;
      let message = {
        actor: actor.name,
        actorId: actor.id,
        item: item.name,
        itemId: itemId,
        roll: {
          labels: {
            result: "",
            title: interpolate("bh2e.messages.titles.usageDie"),
          },
          tested: true,
        },
      };

      if (usageDie.current !== "exhausted") {
        let die =
          usageDie.current === "none" ? usageDie.maximum : usageDie.current;
        let roll = new Roll(generateDieRollFormula({ dieType: die }));

        roll.evaluate().then(() => {
          if (game.dice3d) {
            game.dice3d.showForRoll(roll);
          }

          message.roll.formula = roll.formula;
          message.roll.result = roll.total;

          if (roll.total < 3) {
            let data = { usageDie: { current: "" }, quantity: 0 };
            let oldDie =
              usageDie.current === "none" ? usageDie.maximum : usageDie.current;

            message.roll.success = false;
            message.roll.labels.result = interpolate(
              "bh2e.messages.labels.failure"
            );

            if (oldDie === "d4") {
              message.exhausted = true;
              data.usageDie.current = "exhausted";
              data.quantity = item.system.quantity - 1;
              if (data.quantity < 0) {
                data.quantity = 0;
              }
            } else {
              switch (oldDie) {
                case "d6":
                  data.usageDie.current = "d4";
                  break;
                case "d8":
                  data.usageDie.current = "d6";
                  break;
                case "d10":
                  data.usageDie.current = "d8";
                  break;
                case "d12":
                  data.usageDie.current = "d10";
                  break;
                case "d20":
                  data.usageDie.current = "d12";
                  break;
              }
              message.die = data.usageDie.current;
            }
            if (data.usageDie.current === "exhausted") {
              message.exhausted = true;
            } else {
              message.downgraded = true;
            }
            item
              .update({ system: data }, { diff: true })
              .then((args) =>
                showMessage(
                  actor,
                  "systems/17thcmin/templates/messages/usage-die.hbs",
                  message
                )
              );
          } else {
            message.roll.success = true;
            message.die = die;
            message.roll.labels.result = interpolate(
              "bh2e.messages.labels.success"
            );
            showMessage(
              actor,
              "systems/17thcmin/templates/messages/usage-die.hbs",
              message
            );
          }

          //showMessage(actor, "systems/17thcmin/templates/messages/usage-die.hbs", message);
        });
      } else {
        console.error(
          `The usage die for the '${item.name}' item is already exhausted.`
        );
        ui.notifications.error(
          interpolate("bh2e.messages.errors.usageDieExhausted", {
            item: item.name,
          })
        );
      }
    } else {
      console.error(
        `Failed to locate the equipment for the id ${itemId} on actor id ${actor.id}.`
      );
    }
  } else {
    console.error(`Failed to find the actor that owns equipment id ${itemId}.`);
  }
}

export function showMessage(actor, templateKey, data) {
  getTemplate(templateKey).then((template) => {
    let message = { speaker: ChatMessage.getSpeaker(), user: game.user };

    // console.log("Template Data:", data);
    message.content = template(data);
    ChatMessage.create(message);
  });
}
