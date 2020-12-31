function generate_creature(creature) {
    var main = $('<div class="small-box-shadow generated-item creature"></div>');
    var converter = new showdown.Converter({tables: true, strikethrough: true});
    var basicInfo = $('<div class="basic-info noselect"></div>')
        .append(
            $('<div class="name"></div>')
                .text(creature.name)
        )
        .append(
            $('<div class="name-subtitle"></div>')
                .append(
                    $('<span class="size"></span>').text(creature.size)
                )
                .append('<span> </span>')
                .append(
                    $('<span class="type"></span>').text(creature.creature_type)
                )
                .append('<span>, </span>')
                .append(
                    $('<span class="alignment"></span>').text(creature.alignment)
                )
                .append(
                    $('<div class="cr"></div>')
                        .append(
                            $('<span class="cr-title">CR </span>')
                        )
                        .append(
                            $('<span class="cr-val"></span>').text(creature.challenge_rating)
                        )
                )
        )
        .on('click', function (event) {
            $(event.delegateTarget).parents('.creature').children('.expanded-monster').slideToggle(200);
        });

    main.append(basicInfo);

    var skills = $('<div class="skills"></div>')
        .append($('<span class="smallstat-title">Skills</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.skills), function (e, i) {
            var item = creature.skills[e];
            if (item.override) {
                var value = item.value;
            } else if (item.proficient) {
                var value = Math.floor((Number(creature.abilities[item.ability].score) - 10) / 2) + creature.proficiency_bonus + cond(item.expert, creature.proficiency_bonus, 0);
            } else {
                return null;
            }
            return $.map(e.split('_'), function (x, j) {
                return firstUpper(x);
            }).join(' ') + ' ' + cond(value >= 0, '+', '') + value;
        }).join(', ')));
    if ($(skills).children('.smallstat-value').text().length == 0) {
        skills = null;
    }

    var saves = $('<div class="saves"></div>')
        .append($('<span class="smallstat-title">Saving Throws</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.abilities), function (e, i) {
            var item = creature.abilities[e];
            if (!item.save_proficient && !item.save_override) {
                return null;
            }
            if (item.save_override != null) {
                var value = item.save_override;
            } else {
                var value = Math.floor((Number(item.score) - 10) / 2) + cond(item.save_proficient, creature.proficiency_bonus, 0);
            }
            return firstUpper(e.slice(0, 3)) + ' ' + cond(value >= 0, '+', '') + value;
        }).join(', ')));
    if ($(saves).children('.smallstat-value').text().length == 0) {
        saves = null;
    }

    var vuln = $('<div class="vulnerabilities"></div>')
        .append($('<span class="smallstat-title">Vulnerabilities</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.vulnerabilities), function (e, i) {
            var item = creature.vulnerabilities[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(vuln).children('.smallstat-value').text().length == 0) {
        vuln = null;
    }
    var resist = $('<div class="resistances"></div>')
        .append($('<span class="smallstat-title">Resistances</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.resistances), function (e, i) {
            var item = creature.resistances[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(resist).children('.smallstat-value').text().length == 0) {
        resist = null;
    }
    var immune = $('<div class="immunities"></div>')
        .append($('<span class="smallstat-title">Immunities</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.immunities), function (e, i) {
            var item = creature.immunities[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(immune).children('.smallstat-value').text().length == 0) {
        immune = null;
    }

    var traits = $('<div class="special-abilities"></div>');
    for (var i = 0; i < creature.traits.length; i++) {
        traits.append(
            $('<div class="trait"></div>')
                .append($('<span class="trait-title"></span>').text(creature.traits[i].name + '. '))
                .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.traits[i].desc)))
        );
    }

    var actions = $('<div class="actions"></div>');
    for (var i = 0; i < creature.actions.length; i++) {
        var action = $('<div class="trait"></div>')
            .append($('<span class="trait-title"></span>').text(creature.actions[i].name + '. '))
            .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.actions[i].desc)));
        if (creature.actions[i].automated) {
            action.append(
                $('<div class="action-automated"></div>')
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Type:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(creature.actions[i].type))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Bonus:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(cond(creature.actions[i].bonus >= 0, '+', '') + creature.actions[i].bonus))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Reach/Range:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(creature.actions[i].range.toString().replace(',',' / ') + ' ft.'))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Damage:</span>'))
                            .append($('<span class="smallstat-value"></span>').html($.map(creature.actions[i].damages, function (e, i) {
                                return e.average + ' (' + e.roll + ') ' + e.type + ' damage';
                            }).join(' <b>plus</b> ')))
                    )
            );
        }

        actions.append(action);
    }

    if (creature.legendary_actions != null) {
        var legendary_actions = $('<div class="legendary_actions"></div>');
        var ldesc = creature.legendary_actions.description;
        for (var i = 0; i < creature.legendary_actions.actions.length; i++) {
            legendary_actions.append(
                $('<div class="trait"></div>')
                    .append($('<span class="trait-title"></span>').text(creature.legendary_actions.actions[i].name + '. '))
                    .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.legendary_actions.actions[i].desc)))
            );
        }
    }
    if (creature.reactions.length > 0) {
        var reactions = $('<div class="reactions"></div>');
        for (var i = 0; i < creature.reactions.length; i++) {
            reactions.append(
                $('<div class="trait"></div>')
                    .append($('<span class="trait-title"></span>').text(creature.reactions[i].name + '. '))
                    .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.reactions[i].desc)))
            );
        }
    }

    var expanded = $('<div class="expanded-monster"></div>')
        .append($('<div class="monster-separator"></div>'))
        .append(
            $('<div class="ac"></div>')
                .append($('<span class="smallstat-title">Armor Class</span>'))
                .append($('<span class="smallstat-value"></span>').text(creature.armor_class.current))
        )
        .append(
            $('<div class="hp"></div>')
                .append($('<span class="smallstat-title">Hit Points</span>'))
                .append($('<span class="smallstat-value"></span>').text(creature.hit_points.max + ' (' + creature.hit_dice + ')'))
        )
        .append(
            $('<div class="speeds"></div>')
                .append($('<span class="smallstat-title">Speed</span>'))
                .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.speeds), function (e, i) {
                    if (e == 'hover') {
                        return null;
                    }
                    return e + ' ' + creature.speeds[e].current + ' ft.';
                }).join(', ')))
        )
        .append($('<div class="monster-separator"></div>'))
        .append(
            $('<table class="ability-table"></table>')
                .append(
                    $('<thead><tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr></thead>')
                )
                .append(
                    $('<tbody></tbody>')
                        .append(
                            $('<tr></tr>')
                                .append(
                                    $('<td>' + $.map(Object.keys(creature.abilities), function (e, i) {
                                        var e = creature.abilities[e];
                                        return e.score + ' (' + cond(Math.floor((Number(e.score) - 10) / 2) >= 0, '+', '') + Math.floor((Number(e.score) - 10) / 2) + ')';
                                    }).join('</td><td>') + '</td>')
                                )
                        )
                )
        )
        .append($('<div class="monster-separator"></div>'))
        .append(saves)
        .append(skills)
        .append(vuln)
        .append(resist)
        .append(immune)
        .append(
            cond(
                creature.condition_immunities.length > 0,
                $('<div class="condition_immunities"></div>')
                    .append($('<span class="smallstat-title">Condition Immunities</span>'))
                    .append($('<span class="smallstat-value"></span>').text(creature.condition_immunities.join(', '))),
                ''
            )
        )
        .append(
            $('<div class="senses"></div>')
                .append($('<span class="smallstat-title">Senses</span>'))
                .append($('<span class="smallstat-value"></span>').text('passive Perception ' + (10 + cond(
                    creature.skills.perception.override,
                    creature.skills.perception.value,
                    Math.floor((Number(creature.abilities.wisdom.score) - 10) / 2) + cond(creature.skills.perception.proficient, creature.proficiency_bonus, 0) + cond(creature.skills.perception.expert, creature.proficiency_bonus, 0)
                )) + cond(Object.keys(creature.senses).length > 0, ', ', '') + $.map(Object.keys(creature.senses), function (e, i) {
                    return e + ' ' + creature.senses[e] + ' ft.';
                }).join(', ')))
        )
        .append(
            $('<div class="languages"></div>')
                .append($('<span class="smallstat-title">Languages</span>'))
                .append($('<span class="smallstat-value"></span>').text(cond(creature.languages.length > 0 && creature.languages[0].length > 0, creature.languages.join(', '), '-')))
        )
        .append(
            $('<div class="cr-small"></div>')
                .append($('<span class="smallstat-title">Challenge</span>'))
                .append($('<span class="smallstat-value"></span>').text(creature.challenge_rating + cond(Object.keys(CRXP).includes(creature.challenge_rating.toString()), ' (' + CRXP[creature.challenge_rating.toString()] + ' XP)', '')))
        )
        .append($('<div class="monster-separator"></div>'))
        .append(traits)
        .append($('<div class="actions-title">Actions</div>'))
        .append(actions)
        .append(cond(legendary_actions != undefined, $('<div class="actions-title">Legendary Actions</div>'), null))
        .append(cond(legendary_actions != undefined, $('<div class="actions-desc"></div>').text(ldesc), null))
        .append(cond(legendary_actions != undefined, legendary_actions, null))
        .append(cond(reactions != undefined, $('<div class="actions-title">Reactions</div>'), null))
        .append(cond(reactions != undefined, reactions, null));

    main.append(expanded);

    $(main).children('.expanded-monster').slideUp(0);

    return main;
}

function generate_spell(spell) {
    var main = $('<div class="small-box-shadow generated-item spell"></div>');
    var converter = new showdown.Converter({tables: true, strikethrough: true});
    main.append(
        $('<div class="name"></div>').text(spell.name)
    )
    .append(
        $('<div class="name-subtitle"></div>').text(spell.level.label+' '+spell.categories.school)
    )
    .append(
        $('<div class="casting-time"></div>')
            .append($('<span class="smallstat-title">Casting Time:</span>'))
            .append($('<span class="smallstat-value"></span>').text(spell.casting_time.quantity + ' ' + spell.casting_time.type))
    )
    .append(
        $('<div class="range"></div>')
            .append($('<span class="smallstat-title">Range:</span>'))
            .append($('<span class="smallstat-value"></span>').text(spell.range + cond(isNaN(spell.range),'',' ft.')))
    ).append(
        $('<div class="components"></div>')
            .append($('<span class="smallstat-title">Components:</span>'))
            .append($('<span class="smallstat-value"></span>').text(spell.components.join(', ') + cond(spell.material.length > 0, ' ('+spell.material+')','')))
    ).append(
        $('<div class="duration"></div>')
            .append($('<span class="smallstat-title">Duration:</span>'))
            .append($('<span class="smallstat-value"></span>').text(
                cond(
                    typeof(spell.duration) == 'string',
                    {
                        'instant':'Instantaneous',
                        'dispelled':'Until dispelled',
                        'special':'Special'
                    }[spell.duration],
                    cond(spell.concentration,'Concentration, ','')+cond(spell.duration.up_to,cond(spell.concentration,'up to ','Up to '),'')+spell.duration.quantity+' '+spell.duration.type
                )
            ))
    )
    .append($('<div class="spell-desc"></div>').html(converter.makeHtml(spell.desc)));
    return main;
}

function generate_magicitem(item) {
    var main = $('<div class="small-box-shadow generated-item spell"></div>');
    var converter = new showdown.Converter({tables: true, strikethrough: true});
    main.append(
        $('<div class="name"></div>').text(item.name)
    )
    .append(
        $('<div class="name-subtitle"></div>').text(item.type+', '+item.rarity+cond(item.requires_attunement=='','',' ('+item.requires_attunement+')'))
    )
    .append($('<div class="item-desc"></div>').html(converter.makeHtml(item.desc)));
    return main;
}