var current_cmp = null;
var current_cmp_data = null;

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
                                $('<span class="stat-value"></span>').text(Object.keys(v.maps).length)
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
            if (v.owner == data.uid) {
                item.append(
                    $('<div class="cmp-delete"></div>')
                        .append('<i class="material-icons">delete_forever</i>')
                        .on('click', function (event) {
                            bootbox.confirm('Deleting a campaign is permanent, and data cannot be recovered. Continue?', function (result) {
                                if (result) {
                                    post('/campaign/' + $(event.delegateTarget).parents('.cmp-item').attr('data-id') + '/delete/');
                                }
                            });
                        })
                );
            }

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
        current_cmp = null;
    }
    $('#no-campaign-box').toggle(current_cmp == null);
    current_cmp_data = data.campaigns[current_cmp];
}

function load_cmp_characters(data) {
    var cmpd = data;
    post('/character/batchGet/', function (data) {
        var char_bar = $('<div id="character-panel" class="noscroll"></div>');
        for (var c = 0; c < Object.values(data.characters).length; c++) {
            var char_item = make_character_card(Object.values(data.characters)[c].character, Object.values(data.characters)[c].character.id);
            $(char_item).children('.buttons').children('.character-copy').remove();
            $(char_item).children('.buttons').children('.character-delete').remove();
            if (!cmpd.campaigns[current_cmp].dms.includes(cmpd.uid) && cmpd.campaigns[current_cmp].owner != cmpd.uid && Object.values(data.characters)[c].character.owner != cmpd.uid) {
                $(char_item).children('.buttons').children('.character-edit').remove();
                $(char_item).children('.card-image').off('click');
                $(char_item).css('cursor', 'default');
                $(char_item).children('.card-image').css('cursor', 'default');
            }
            char_bar.append(char_item);
        }
        $(char_bar).replaceAll('#character-panel');
    }, {}, { ids: data.campaigns[current_cmp].characters });
}

function load_cmp_maps(data) {
    var maps = data.campaigns[current_cmp].maps;
    var maps_panel = $('<div id="maps-panel" class="noselect noscroll"></div>');
    maps_panel.append(Object.keys(maps).map(function (v, i, a) {
        var map = maps[v];
        var item = $('<div class="map-item noselect card"></div>');
        item.attr('data-id',v);
        item.append(
            $('<span class="card-image"></span>')
                .append(
                    $('<img>').attr('src',format_loaded_url(map.map_img))
                )
        );
        item.append(
            $('<div class="card-content"></div>')
                .append($('<div class="title"></div>').text(map.name))
                .append($('<div class="content"></div>').text(map.dimensions.columns + ' x ' + map.dimensions.rows + ' @ '+ map.dimensions.scale + 'ft.'))
        );
        item.append(
            $('<div class="buttons"></div>')
                .append(
                    $('<button id="play-map-button"></button>')
                        .append('<i class="material-icons">play_arrow</i>')
                        .append('<span>Play</span>')
                )
                .append(
                    $('<button id="delete-map-button"></button>')
                        .append('<i class="material-icons">delete</i>')
                        .append('<span>Delete</span>')
                        .on('click', function (event) {
                            bootbox.confirm('Deleting this map will delete all of its associated data, which cannot be recovered. Continue?', function (result) {
                                if (result) {
                                    post('/campaign/'+current_cmp+'/maps/'+$(event.delegateTarget).parents('.buttons').parents('.map-item').attr('data-id')+'/delete/');
                                }
                            });
                        })
                )
        )
        return item;
    }));
    maps_panel.replaceAll('#maps-panel')
}

function load_cmp_page(data) {
    update_cmp_directory(data);
    load_cmp_characters(data);
    load_cmp_maps(data);
}

function pagelocal_update(data) {
    if (data.updates.campaigns.global || data.updates.campaigns.specific[current_cmp]) {
        get('/campaign/', load_cmp_page);
    }
}

$(document).ready(function () {
    $('#add-map-dialog').hide();
    $('#dialog-modal').hide();
    get('/campaign/', load_cmp_page);

    $('#add-cmp').on('click', function (event) {
        bootbox.prompt('Enter name of new campaign.', function (result) {
            if (result) {
                post('/campaign/new/', console.log, {}, { name: result });
            }
        });
    });

    $('#img-upload').on('click', function (event) {
        $('#map-img-input').trigger('click');
    });
    $('#map-img-input').on('change', function (event) {
        var file = this.files[0];
        var reader = new FileReader();
        $(reader).on('load', function () {
            $('#map-img-prev img').attr('src', reader.result);
        });
        reader.readAsDataURL(file);
    });

    $('#add-map').on('click', function (event) {
        $('#add-map-dialog input').val('');
        $('#add-map-dialog img').attr('src', 'none');
        $('#add-map-dialog').show();
        $('#dialog-modal').show();
    });
    $('#dialog-modal').on('click', function (event) {
        $('#add-map-dialog').hide();
        $('#dialog-modal').hide();
    });
    $('#submit-map').on('click', function (event) {
        if (
            $('#map-img-prev img').attr('src') == 'none'
            || $('#map-cols input').val() == ''
            || $('#map-rows input').val() == ''
            || $('#map-scale input').val() == ''
            || $('#map-name input').val() == ''
        ) {
            bootbox.alert('Please fill out all fields, and make sure you have a map image uploaded.');
        } else {
            var imgdata = $('#add-map-dialog img').attr('src');
            var dimensions = {
                columns: Number($('#map-cols input').val()),
                rows: Number($('#map-rows input').val()),
                scale: Number($('#map-scale input').val())
            };
            post(
                '/fs/images/',
                function (result) {
                    post(
                        '/campaign/' + current_cmp + '/maps/new/',
                        function (result) {
                            $('#add-map-dialog').hide();
                            $('#dialog-modal').hide();

                        },
                        {},
                        {
                            image: '/fs/images/' + result.id + '/?fingerprint={fp}',
                            dimensions: dimensions,
                            name: $('#map-name input').val()
                        },
                        true
                    );
                },
                {},
                {
                    uri: imgdata,
                    permissions: {
                        user: [uid],
                        campaign_participant: current_cmp_data.players,
                        campaign_dm: current_cmp_data.dms
                    }
                }
            );
        }
    });
});