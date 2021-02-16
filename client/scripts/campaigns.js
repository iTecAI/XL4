var current_cmp = null;

function update_cmp_directory(data) {
    var params = parse_query_string();
    console.log(data);
    $('<div id="campaigns"></div>')
        .append(Object.values(data.campaigns).map(function (v, i, a) {
            var item = $('<div class="cmp-item"></div>')
                .attr('data-id', v.id);
            if (v.icon) {
                item.append(
                    $('<div class="cmp-item-icon noselect"></div>')
                        .append(
                            $('<img>').attr('src', v.icon)
                        )
                );
            } else {
                var title_parts = v.name.split(' ');
                var fls = [];
                for (var x = 0; x < title_parts.length; x++) {
                    if (!['and', 'the'].includes(title_parts[x].toLowerCase()) && title_parts[x].length > 0) {
                        fls.push(title_parts[x][0].toUpperCase());
                    }
                    if (fls.length >= 3) {
                        break;
                    }
                }
                item.append(
                    $('<div class="cmp-item-icon noselect"></div>')
                        .append(
                            $('<span></span>')
                                .text(fls.join(''))
                        )
                );
            }

            item.append(
                $('<div class="cmp-name noselect"></div>')
                    .append($('<span></span>').text(v.name))
            );
            item.append(
                $('<div class="cmp-stats"></div>')
                    .append(
                        $('<div class="stat noselect"></div>')
                            .append(
                                $('<span class="stat-title"></span>').text('Characters: ')
                            )
                            .append(
                                $('<span class="stat-value"></span>').text(v.characters.length)
                            )
                    )
                    .append(
                        $('<div class="stat noselect"></div>')
                            .append(
                                $('<span class="stat-title"></span>').text('Maps: ')
                            )
                            .append(
                                $('<span class="stat-value"></span>').text(v.maps.length)
                            )
                    )
                    .append(
                        $('<div class="stat id-stat"></div>')
                            .append(
                                $('<span class="stat-title noselect"></span>').text('ID: ')
                            )
                            .append(
                                $('<span class="stat-value"></span>').text(v.id)
                            )
                    )
            );
            item.append(
                $('<div class="cmp-delete"></div>')
                    .append('<i class="material-icons">delete_forever</i>')
                    .on('click', function (event) {
                        bootbox.confirm('Deleting a campaign is permanent, and data cannot be recovered. Continue?', function (result) {
                            if (result) {
                                post('/campaign/'+$(event.delegateTarget).parents('.cmp-item').attr('data-id')+'/delete/');
                            }
                        });
                    })
            );

            if (Object.keys(params).includes('cmp')) {
                if (params.cmp == v.id) {
                    item.addClass('selected');
                    current_cmp = v.id;
                }
            } else {
                if (v.id == a[0].id) {
                    item.addClass('selected');
                    current_cmp = v.id;
                }
            }

            item.on('click', function (event) {
                if (!($(event.target).hasClass('cmp-delete') || $(event.target).parents('.cmp-delete').length != 0 || $(event.target).hasClass('id-stat') || $(event.target).parents('.id-stat').length != 0)) {
                    window.location = '/campaigns?cmp=' + $(this).attr('data-id');
                }
            });

            return item;
        }))
        .replaceAll('#campaigns');

    if ($('.cmp-item.selected').length == 0) {
        $('.cmp-item').first().addClass('selected');
    }
    if ($('.cmp-item.selected').length != 0) {
        current_cmp = $('.cmp-item.selected').attr('data-id');
    } else {
        current_cmp =  null;
    }
    $('#no-campaign-box').toggle(current_cmp == null);
}

function load_cmp_characters(data) {
    post('/character/batchGet/',function (data) {
        console.log(data);
        var char_bar = $('<div id="character-panel" class="noscroll"></div>');
        for (var c = 0; c < Object.values(data.characters).length; c++) {
            var char_item = make_character_card(Object.values(data.characters)[c].character, Object.values(data.characters)[c].character.id);
            $(char_item).children('.buttons').children('.character-copy').remove();
            $(char_item).children('.buttons').children('.character-delete').remove();
            char_bar.append(char_item);
        }
        $(char_bar).replaceAll('#character-panel');
    },{},{ids:data.campaigns[current_cmp].characters});
}

function load_cmp_page(data) {
    update_cmp_directory(data);
    load_cmp_characters(data);
}

function pagelocal_update(data) {
    if (data.updates.campaigns.global) {
        get('/campaign/', load_cmp_page);
    }
}

$(document).ready(function () {
    get('/campaign/', load_cmp_page);

    $('#add-cmp').on('click', function (event) {
        bootbox.prompt('Enter name of new campaign.', function (result) {
            if (result) {
                post('/campaign/new/',console.log,{},{name:result});
            }
        });
    });
});