function setup_map_base() {
    var map_container = $('<div id="map-container" class="noselect noscroll"></div>');
    if (localStorage.getItem('mapcache:' + current_map_data.id) == null) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var reader = new FileReader();
                $(reader).on('load', function () {
                    localStorage.setItem('mapcache:' + current_map_data.id, this.result);
                });
                reader.readAsDataURL(this.response);
            }
        }
        xhr.open('GET', format_loaded_url(current_map_data.map_img));
        xhr.responseType = 'blob';
        xhr.send();
        map_container.append($('<img draggable=false>').attr('src', format_loaded_url(current_map_data.map_img)));
    } else {
        map_container.append($('<img draggable=false>').attr('src', localStorage.getItem('mapcache:' + current_map_data.id)));
    }

    $(map_container).on('mousedown', function (e) {
        if ($(e.target).hasClass('object') || $(e.target).parents('.object').length > 0) {
            if ((!current_cmp_data.dms.includes(uid) && !(
                (($(e.target).hasClass('character') && $(e.target).hasClass('owned')) || $(e.target).parents('.character.owned').length > 0) ||
                ($(e.target).hasClass('shape') || $(e.target).parents('.shape').length > 0)
            )) || ($(e.target).hasClass('obscure') || $(e.target).parents('.obscure').length > 0)) {

            } else {
                return;
            }
        }
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            start = { x: e.clientX - xoff, y: e.clientY - yoff };
            panning = true;
        } else if (current_tool == 'measure') {
            measure_start = evGetPercentPosition(e);
            measuring = true;
            $('#measure-tool').remove();
            $('#measuring-container').remove();
            $('#map-container').append(
                $('<div id="measuring-container"></div>')
                    .append(
                        $('<svg id="measure-tool" version="1.1" width="100%" height="100%"></svg>')
                            .css({
                                position: 'absolute',
                                top: '0px',
                                left: '0px'
                            })
                    )
                    .css({
                        position: 'absolute',
                        top: measure_start.y + '%',
                        left: measure_start.x + '%'
                    })
                    .append(
                        $('<span>0 ft.</span>')
                    )
            );

            var svgel = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            svgel.setAttribute('x1', '0');
            svgel.setAttribute('y1', '0');
            svgel.setAttribute('stroke', 'var(--secondary)');
            svgel.setAttribute('stroke-width', '2');
            document.getElementById('measure-tool').appendChild(svgel);
            if (measure_timeout != null) {
                clearTimeout(measure_timeout);
            }
        } else if (current_tool == 'obscure') {
            startSelector(e);
        } else if (current_tool == 'shape') {
            if ($('#toolbar-shapes button.selected').attr('data-shape') == 'rectangle') {
                startSelector(e);
                $('#selection-box').append('<span class="measurement"></span>');
            } else if ($('#toolbar-shapes button.selected').attr('data-shape') == 'circle') {
                startSelector(e, 'circle');
                $('#selection-box').append('<span class="measurement"></span>');
            }
        }
    });
    $(map_container).on('mouseup', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            panning = false;
        } else if (current_tool == 'measure' && measuring) {
            var curpos = evGetPercentPosition(e);
            var dx = (curpos.x - measure_start.x) * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100;
            var dy = (curpos.y - measure_start.y) * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100;
            var dist = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));
            measuring = false;
            if (dist < 1) {
                $('#measuring-container').remove();
            } else {
                measure_timeout = window.setTimeout(function () {
                    $('#measuring-container').remove();
                }, 5000);
            }
        } else if (current_tool == 'obscure') {
            var selector_data = finishSelector();
            if (selector_data.dimensions.left + selector_data.dimensions.width > 100) {
                selector_data.dimensions.width = 100 - selector_data.dimensions.left;
            }
            if (selector_data.dimensions.top + selector_data.dimensions.height > 100) {
                selector_data.dimensions.height = 100 - selector_data.dimensions.top;
            }
            if (Math.abs(selector_data.dimensions.width) < 0.002 || Math.abs(selector_data.dimensions.height) < 0.002 || (selector_data.dimensions.top == 0.0 && selector_data.dimensions.left == 0.0)) {
                return;
            }
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                console.log,
                {}, {
                object_type: 'obscure',
                data: {
                    width: selector_data.dimensions.width,
                    height: selector_data.dimensions.height
                },
                x: selector_data.dimensions.left,
                y: selector_data.dimensions.top
            }
            );
        } else if (current_tool == 'shape') {
            if ($('#selection-box').hasClass('selecting')) {
                $('#selection-box .measurement').remove();
                var selector_data = finishSelector();
                if (selector_data.dimensions.left + selector_data.dimensions.width > 100) {
                    selector_data.dimensions.width = 100 - selector_data.dimensions.left;
                }
                if (selector_data.dimensions.top + selector_data.dimensions.height > 100) {
                    selector_data.dimensions.height = 100 - selector_data.dimensions.top;
                }
                if (Math.abs(selector_data.dimensions.width) < 0.002 || Math.abs(selector_data.dimensions.height) < 0.002 || (selector_data.dimensions.top == 0.0 && selector_data.dimensions.left == 0.0)) {
                    return;
                }
                if (selector_data.type == 'rectangle') {
                    post(
                        '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                        console.log,
                        {}, {
                        object_type: 'shape',
                        data: {
                            shape_type: 'rectangle',
                            width: selector_data.dimensions.width,
                            height: selector_data.dimensions.height,
                            player_visible: true,
                            color: 'red'
                        },
                        x: selector_data.dimensions.left + 0.5 * selector_data.dimensions.width,
                        y: selector_data.dimensions.top + 0.5 * selector_data.dimensions.height
                    }
                    );
                } else if (selector_data.type == 'circle') {
                    post(
                        '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                        console.log,
                        {}, {
                        object_type: 'shape',
                        data: {
                            shape_type: 'circle',
                            width: selector_data.dimensions.width,
                            height: selector_data.dimensions.height,
                            player_visible: true,
                            color: 'red'
                        },
                        x: selector_data.dimensions.left + 0.5 * selector_data.dimensions.width,
                        y: selector_data.dimensions.top + 0.5 * selector_data.dimensions.height
                    }
                    );
                }
            }
        }
    });
    $(map_container).on('mousemove', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            if (!panning) {
                return;
            }
            xoff = (e.clientX - start.x);
            yoff = (e.clientY - start.y);
            setTransform(map_container);
        } else if (current_tool == 'measure' && measuring) {
            var curpos = evGetPercentPosition(e);
            if (curpos.x >= measure_start.x && curpos.y >= measure_start.y) {
                var top = measure_start.y;
                var left = measure_start.x;
                var width = curpos.x - measure_start.x;
                var height = curpos.y - measure_start.y;
                var x1 = 0;
                var y1 = 0;
                var x2 = $('#measure-tool').width();
                var y2 = $('#measure-tool').height();
            } else if (curpos.x < measure_start.x && curpos.y >= measure_start.y) {
                var top = measure_start.y;
                var left = curpos.x;
                var width = measure_start.x - curpos.x;
                var height = curpos.y - measure_start.y;
                var x1 = $('#measure-tool').width();
                var y1 = 0;
                var x2 = 0;
                var y2 = $('#measure-tool').height();
            } else if (curpos.x >= measure_start.x && curpos.y < measure_start.y) {
                var top = curpos.y;
                var left = measure_start.x;
                var width = curpos.x - measure_start.x;
                var height = measure_start.y - curpos.y;
                var x1 = 0;
                var y1 = $('#measure-tool').height();
                var x2 = $('#measure-tool').width();
                var y2 = 0;
            } else {
                var top = curpos.y;
                var left = curpos.x;
                var width = measure_start.x - curpos.x;
                var height = measure_start.y - curpos.y;
                var x1 = 0;
                var y1 = 0;
                var x2 = $('#measure-tool').width();
                var y2 = $('#measure-tool').height();
            }

            $('#measuring-container').css({
                top: top + '%',
                left: left + '%',
                height: (height + 0.1) + '%',
                width: (width + 0.1) + '%'
            });
            document.getElementById('measure-tool').children[0].setAttribute('x1', x1);
            document.getElementById('measure-tool').children[0].setAttribute('y1', y1);
            document.getElementById('measure-tool').children[0].setAttribute('x2', x2);
            document.getElementById('measure-tool').children[0].setAttribute('y2', y2);

            var curpos = evGetPercentPosition(e);
            var dx = (curpos.x - measure_start.x) * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100;
            var dy = (curpos.y - measure_start.y) * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100;
            var dist = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));

            $('#measuring-container span').text(dist + ' ft.');
        } else if (current_tool == 'obscure') {
            updateSelector(e);
        } else if (current_tool == 'shape') {
            updateSelector(e);
            if ($('#toolbar-shapes button.selected').attr('data-shape') != null) {
                if ($('#toolbar-shapes button.selected').attr('data-shape') == 'rectangle') {
                    var dims = updateSelector(e);
                    $('#selection-box .measurement').text(
                        String(Math.round(dims.width * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100)) +
                        'ft. x ' +
                        String(Math.round(dims.height * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100)) + 'ft.'
                    );
                } else if ($('#toolbar-shapes button.selected').attr('data-shape') == 'circle') {
                    var dims = updateSelector(e);
                    $('#selection-box .measurement').text(
                        String(Math.round(dims.width * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100)) +
                        'ft. x ' +
                        String(Math.round(dims.height * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100)) + 'ft.'
                    );
                }

            }
        }
    });
    $(map_container).on('wheel', function (e) {
        if ($(e.target).hasClass('creature') || $(e.target).parents('.creature').length > 0) {
            return;
        }
        e.preventDefault();
        e = e.originalEvent;
        // take the scale into account with the offset
        var xs = (e.clientX - xoff) / scale,
            ys = (e.clientY - yoff) / scale,
            delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);

        // get scroll direction & set zoom level
        (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);

        if (scale > scale_max) {
            scale = scale_max + 0;
        }
        if (scale < scale_min) {
            scale = scale_min + 0;
        }

        // reverse the offset amount with the new scale
        xoff = e.clientX - xs * scale;
        yoff = e.clientY - ys * scale;

        setTransform(map_container);
    });

    $(map_container).on('click', function (e) {
        if (($(e.target).hasClass('object') || $(e.target).parents('.object').length > 0) || ($(e.target).hasClass('obscure') || $(e.target).parents('.obscure').length > 0)) {
            if (!current_cmp_data.dms.includes(uid) && (
                ($(e.target).hasClass('npc') || $(e.target).parents('.npc').length > 0)
            )) {

            } else {
                return;
            }
        }
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'note') {
            var pos = evGetPercentPosition(e);
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                console.log,
                {}, {
                object_type: 'note',
                data: {
                    color: 'white',
                    content: $('.note').length + 1,
                    player_visible: true
                },
                x: pos.x,
                y: pos.y
            }
            );
        }
    });
    $(map_container).on('ctx:add_character', function (event) {
        var uchars = JSON.parse(localStorage.user_data).characters;
        for (var i = 0; i < Object.values(current_map_data.objects).length; i++) {
            if (Object.values(current_map_data.objects)[i].type == 'character') {
                if (uchars.includes(Object.values(current_map_data.objects)[i].data.char_id)) {
                    uchars.splice(uchars.indexOf(Object.values(current_map_data.objects)[i].data.char_id), 1);
                }
            }
        }
        var nuchars = [];
        for (var u = 0; u < uchars.length; u++) {
            if (current_cmp_data.characters.includes(uchars[u])) {
                nuchars.push(uchars[u]);
            }
        }
        post(
            '/character/batchGet/',
            function (data) {
                $('<div id="add-character-dialog" class="noselect"></div>')
                    .attr('data-position', JSON.stringify({ x: event.x, y: event.y }))
                    .attr('data-characters', JSON.stringify(data.characters))
                    .append(Object.values(data.characters).map(function (v, i, a) {
                        return $('<div class="add-character-item"></div>')
                            .attr('data-id', v.character.id)
                            .append(
                                $('<span class="char-img"></span>')
                                    .append($('<img>').attr('src', cond(v.character.appearance.image == null, 'assets/logo.png', v.character.appearance.image)))
                            )
                            .append(
                                $('<span class="char-name"></span>')
                                    .text(v.character.name)
                            )
                            .on('click', function (event) {
                                var pos = JSON.parse($(this).parents('#add-character-dialog').attr('data-position'));
                                pos = getPercentPosition(pos.x, pos.y);
                                post(
                                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                                    function () {
                                        $('#add-character-dialog').remove();
                                    },
                                    {}, {
                                    object_type: 'character',
                                    data: {
                                        owner: uid,
                                        char_id: $(event.delegateTarget).attr('data-id'),
                                        background: true
                                    },
                                    x: pos.x,
                                    y: pos.y
                                }
                                );
                            });
                    }))
                    .appendTo('body');
            }, {}, { ids: nuchars }
        );
    });
    $(map_container).on('ctx:add_npc', function (event) {
        $('#finish-npc').attr('data-pos', JSON.stringify({ x: event.x, y: event.y }));
        $('#add-npc-dialog .npc-search input').val('');
        $('#add-npc-dialog .npc-list .npc-item').remove();
        $('#add-npc-dialog .npc-options input').val('');
        $('#add-npc-dialog .npc-options select').val('medium');
        $('#add-npc-dialog .npc-options img').attr('src', 'assets/logo.png');
        $('#finish-npc').attr('data-npc', '{}');
        $('#add-npc-dialog').animate({ width: 'show' }, 200);
    });

    setTransform(map_container);
    return map_container;
}

function setup_static_elements() {
    return [
        $('<div id="selection-box"></div>')
    ];
}

function draw_map() {
    var player = $('<div id="player"></div>');
    player.append(setup_map_base());
    player.children('#map-container').append(setup_static_elements());
    player.children('#map-container').append(draw_objects());

    player.replaceAll('#player');
    $('#player').attr('data-tool', current_tool);
    $('.object.note .note-content').each(function (i, e) {
        $(e).css('max-width', ($(e).parents('.note').width() + 25) + 'px');
    });
    $('.object.character').each(function () {
        var sz = size_map[cond(Object.keys(size_map).includes(current_cmp_data.character_data[$(this).attr('data-cid')].size), current_cmp_data.character_data[$(this).attr('data-cid')].size, 'medium')];
        var dims = ftToPercentDimensions(sz, sz);
        $(this).css({
            width: dims.w + '%',
            height: dims.h + '%'
        });
    });
    $('.object.npc').each(function () {
        var sz = size_map[cond(Object.keys(size_map).includes(current_map_data.objects[$(this).attr('data-oid')].data.data.size), current_map_data.objects[$(this).attr('data-oid')].data.data.size, 'medium')];
        var dims = ftToPercentDimensions(sz, sz);
        $(this).css({
            width: dims.w + '%',
            height: dims.h + '%'
        });
    });
}

function update_settings() {
    $('#map-name').val(current_map_data.name);
    $('#map-cols').val(current_map_data.dimensions.columns);
    $('#map-rows').val(current_map_data.dimensions.rows);
    $('#map-scale').val(current_map_data.dimensions.scale);
}

function prep_dynamic_event_listeners() {
    Object.keys(cursor_tool_map).map(function (v) {
        $(v).off('mousemove').on('mousemove', function (event) {
            for (var i = 0; i < Object.keys(cursor_tool_map).length; i++) {
                if ($(this).is(Object.keys(cursor_tool_map)[i])) {
                    $(this).css('cursor', cursor_tool_map[Object.keys(cursor_tool_map)[i]][current_tool]);
                }
            }
        });
    });
}

function toolbar_check() {
    $('#toolbar .dm-tool').toggle(current_cmp_data.dms.includes(uid));
    $('#toolbar-shapes').toggle(current_tool == 'shape');
    $('#content-box').toggleClass('dm', current_cmp_data.dms.includes(uid));
}

function update_initiative() {
    if (Object.keys(current_map_data.initiative.combatants).length == 0) {
        $('#initiative-bar').hide();
    } else {
        $('#initiative-bar').show();
    }
    if (current_map_data.initiative.active) {
        $('#run-init').hide();
        $('#end-init').show();
        $('#next-init').show();
    } else {
        $('#run-init').show();
        $('#end-init').hide();
        $('#next-init').hide();
    }

    if (Object.keys(current_map_data.initiative.combatants).length > 0) {
        var dummy_init = $('<div id="init-items"></div>');
        var combatants = Object.keys(current_map_data.initiative.combatants).sort((a, b) => a - b).reverse();
        for (var c = 0; c < combatants.length; c++) {
            if (current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].type == 'character') {
                if (current_cmp_data.character_data[current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.char_id].appearance.image == null) {
                    var img = 'assets/logo.png';
                } else {
                    var img = current_cmp_data.character_data[current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.char_id].appearance.image;
                }
                var name = current_cmp_data.character_data[current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.char_id].name;
            } else if (current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].type == 'npc_basic') {
                if (current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.image == null) {
                    var img = 'assets/logo.png';
                } else {
                    var img = current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.image;
                }
                var name = current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.name;
            } else if (current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].type == 'npc') {
                if (current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.image == null) {
                    var img = 'assets/logo.png';
                } else {
                    var img = current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.image;
                }
                var name = current_map_data.objects[current_map_data.initiative.combatants[combatants[c]]].data.data.name;
            } else {
                continue;
            }

            dummy_init.append(
                $('<div class="init-item"></div>')
                    .attr('data-oid', current_map_data.initiative.combatants[combatants[c]])
                    .attr('data-tippy-content', name)
                    .toggleClass('current', current_map_data.initiative.current == combatants[c] && current_map_data.initiative.active)
                    .append(
                        $('<span class="init-img"></span>')
                            .append(
                                $('<img>')
                                    .attr('src', img)
                            )
                    )
                    .append(
                        $('<div class="init-val"></div>')
                            .append(
                                $('<span></span>')
                                    .text(Math.round(combatants[c]))
                            )
                    )
                    .append(
                        $('<button class="skip-to-init"><i class="material-icons">skip_next</i></button>')
                        .on('click', function (event) {
                            post(
                                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/initiative/skip_to/',
                                console.log,
                                {},
                                {
                                    oid: $(this).parents('.init-item').attr('data-oid')
                                }
                            );
                            $('.object[data-oid=' + $(this).parents('.init-item').attr('data-oid') + ']').removeClass('in-initiative');
                        })
                    )
                    .append(
                        $('<button class="remove-init"><i class="material-icons">delete</i></button>')
                            .on('click', function (event) {
                                post(
                                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/initiative/remove/',
                                    console.log,
                                    {},
                                    {
                                        oid: $(this).parents('.init-item').attr('data-oid')
                                    }
                                );
                                $('.object[data-oid=' + $(this).parents('.init-item').attr('data-oid') + ']').removeClass('in-initiative');
                            })
                    )
            );
        }
        dummy_init.replaceAll('#init-items');
        tippy('#init-items .init-item', {
            placement: 'right',
            arrow: true,
            theme: 'material',
            offset: [0, 15],
            delay: [200, 0]
        });
    }
}

function overall_update(data) {
    current_map_data = data;
    get('/campaign/' + data.campaign + '/', function (_data) {
        current_cmp_data = _data;
        update_settings()
        draw_map();

        prep_dynamic_event_listeners();
        toolbar_check();

        update_initiative();
    });
}

function pagelocal_update(data) {
    $(document).scrollTop(0);
    if (
        data.updates.campaigns.global ||
        data.updates.campaigns.specific[params.campaign] ||
        data.updates.maps.global ||
        data.updates.maps.specific[params.map] ||
        current_cmp_data.characters.some(function (v, i, a) { return data.updates.characters.specific[v]; })
    ) {
        get(
            '/campaign/' + params.campaign + '/maps/' + params.map + '/',
            overall_update
        );
    }
}

function setup_tagifiers() {

}

$(document).ready(function () {
    $('#context-menu').hide();
    $('#toolbar-shapes').hide();
    $('#initiative-bar').hide()
    $('#add-npc-dialog').animate({ width: 'hide' }, 0);

    $(document).on('click', function (event) {
        if (!$(event.target).is('#context-menu') && $(event.target).parents('#context-menu').length == 0) {
            $('#context-menu').hide();
            $('.current-ctx').removeClass('current-ctx');
        }
        if (!$(event.target).is('#add-character-dialog') && $(event.target).parents('#add-character-dialog').length == 0 && $('#add-character-dialog').length > 0) {
            $('#add-character-dialog').remove();
        }
        if (
            !$(event.target).is('#add-npc-dialog') &&
            $(event.target).parents('#add-npc-dialog').length == 0 &&
            $('#add-npc-dialog').length > 0 &&
            !$(event.target).is('#context-menu') &&
            $(event.target).parents('#context-menu').length == 0
        ) {
            $('#add-npc-dialog').animate({ 'width': 'hide' }, 200);
        }
    });
    params = parse_query_string();
    if (Object.keys(params).length != 2) {
        bootbox.alert('Error fetching map. Returning to campaign page.', function () {
            window.location = '/campaigns';
        });
    } else {
        setup_tagifiers();
        get(
            '/campaign/' + params.campaign + '/maps/' + params.map + '/',
            overall_update
        ).fail(function (result) {
            console.log(result);
            bootbox.alert('Error fetching map: ' + result.responseJSON.result + '<br>Returning to campaign page.', function () {
                window.location = '/campaigns';
            });
        });

        $('#map-name').on('change', function (event) {
            post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                path: 'name',
                value: $(this).val()
            });
        });
        $('#map-cols').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.columns',
                    value: Number($(this).val())
                });
            }
        });
        $('#map-rows').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.rows',
                    value: Number($(this).val())
                });
            }
        });
        $('#map-scale').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.scale',
                    value: Number($(this).val())
                });
            }
        });

        $('#toolbar button').on('click', function (event) {
            if ($(this).attr('data-tool') == 'home') {
                xoff = 0;
                yoff = 0;
                scale = 1;
                setTransform('#map-container');
                panning = false;
                return;
            }
            $('#toolbar button.selected').removeClass('selected');
            current_tool = $(this).attr('data-tool');
            $(this).addClass('selected');
            $('#measuring-container').remove();
            $('#player').attr('data-tool', current_tool);
            $('#toolbar-shapes').toggle(current_tool == 'shape');
        });
        $('#toolbar-shapes button').on('click', function (event) {
            $('#toolbar-shapes button.selected').removeClass('selected');
            $(this).addClass('selected');
        });

        tippy('#toolbar button', {
            placement: 'right',
            arrow: true,
            theme: 'material',
            offset: [0, 15]
        });
        tippy('#toolbar-shapes button', {
            placement: 'bottom',
            arrow: true,
            theme: 'material',
            offset: [0, 15]
        });
        tippy('#init-buttons button', {
            placement: 'right',
            arrow: true,
            theme: 'material',
            offset: [0, 15]
        });

        $(document).on('contextmenu', function (event) {
            var ctx_keys = Object.keys(custom_ctx);
            var showing_items = [];
            for (var c = 0; c < ctx_keys.length; c++) {
                var item = custom_ctx[ctx_keys[c]][cond(current_cmp_data.dms.includes(uid), 'dms', 'players')];
                var showing = Object.keys(item).length != 0;
                if (showing) {
                    if (Object.keys(item).includes('classes') && showing) {
                        var classes = [];
                        for (var i = 0; i < item.classes.length; i++) {
                            if (item.classes[i].match_type == 'any') {
                                classes.push(item.classes[i].match.some(function (v, i, a) { return (!$(event.target).hasClass(v.slice(1)) && !$(event.target).parentsUntil('#player', '.' + v.slice(1)).length > 0 && v[0] == '!') || (v[0] != '!' && ($(event.target).hasClass(v) || ($(event.target).parentsUntil('#player', '.' + v.replace(/!/g, '')).length > 0))); }));
                            } else if (item.classes[i].match_type == 'all') {
                                classes.push(item.classes[i].match.every(function (v, i, a) { return (!$(event.target).hasClass(v.slice(1)) && !$(event.target).parentsUntil('#player', '.' + v.slice(1)).length > 0 && v[0] == '!') || (v[0] != '!' && ($(event.target).hasClass(v) || ($(event.target).parentsUntil('#player', '.' + v.replace(/!/g, '')).length > 0))); }));
                            }
                        }
                        showing = classes.some(function (v) { return v; });
                    }
                    if (Object.keys(item).includes('selector') && showing) {
                        var selectors = [];
                        for (var i = 0; i < item.selector.length; i++) {
                            if (item.selector[i].match_type == 'any' && showing) {
                                selectors.push(item.selector[i].match.some(function (v, i, a) { return $(event.target).is(v); }));
                            } else if (item.selector[i].match_type == 'all' && showing) {
                                selectors.push(item.selector[i].match.every(function (v, i, a) { return $(event.target).is(v); }));
                            }
                        }
                        showing = selectors.some(function (v) { return v; });
                    }
                    function match_predicate(e, v) {
                        if (v == 'has_character_in_campaign') {
                            var uchars = JSON.parse(localStorage.user_data).characters;
                            return uchars.some(function (x) { return current_cmp_data.characters.includes(x); });
                        } else if (v == 'all_characters_in_map') {
                            var uchars = JSON.parse(localStorage.user_data).characters;
                            var nuchars = [];
                            for (var c = 0; c < uchars.length; c++) {
                                if (current_cmp_data.characters.includes(uchars[c])) {
                                    nuchars.push(uchars[c]);
                                }
                            }
                            var mchars = Object.values(current_map_data.objects).map(function (v, i, a) {
                                if (v.type == 'character') {
                                    return v.data.char_id;
                                }
                            });
                            return nuchars.every(function (x) { return mchars.includes(x); });
                        }
                    }

                    if (Object.keys(item).includes('predicate') && showing) {
                        var predicates = [];
                        for (var i = 0; i < item.predicate.length; i++) {
                            if (item.predicate[i].match_type == 'any' && showing) {
                                predicates.push(item.predicate[i].match.some(function (v, i, a) { return match_predicate(event, v); }));
                            } else if (item.predicate[i].match_type == 'all' && showing) {
                                predicates.push(item.predicate[i].match.every(function (v, i, a) { return match_predicate(event, v); }));
                            } else if (item.predicate[i].match_type == 'not any' && showing) {
                                predicates.push(!item.predicate[i].match.some(function (v, i, a) { return match_predicate(event, v); }));
                            }
                        }
                        showing = predicates.every(function (v) { return v; });
                    }

                    if (showing) {
                        showing_items.push(ctx_keys[c]);
                    }
                }
            }
            $('.ctx-item').hide();
            showing_items.forEach(function (v) { $('.ctx-item[data-ctx=' + v + ']').show(); });
            if (showing_items.length > 0) {
                event.preventDefault();
                $('.current-ctx').removeClass('current-ctx');
                $(event.target).addClass('current-ctx');
                $('#context-menu')
                    .css({
                        top: (event.clientY + 5) + 'px',
                        left: (event.clientX + 5) + 'px',
                        height: (showing_items.length * 40) + 'px'
                    })
                    .show();
            } else {
                $('.current-ctx').removeClass('current-ctx');
                $('#context-menu').hide();
            }
        });

        $('.ctx-item').on('click', function (event) {
            $('.current-ctx').trigger({
                type: 'ctx:' + $(event.delegateTarget).attr('data-ctx'),
                x: $('#context-menu').offset().left,
                y: $('#context-menu').offset().top
            });
            $('#context-menu').hide();
            $('.current-ctx').removeClass('current-ctx');
        });

        $('#gridlock-toggle button').on('click', function (event) {
            if ($('#gridlock-toggle').attr('data-on') == 'false') {
                $('#gridlock-toggle').attr('data-on', 'true');
                $('#gridlock-toggle button i').text('grid_on');
            } else {
                $('#gridlock-toggle').attr('data-on', 'false');
                $('#gridlock-toggle button i').text('grid_off');
            }
        });
        $('#add-npc-dialog .npc-search input').on('change', function (event) {
            if ($(this).val().length > 0) {
                get('/campaign/' + current_cmp_data.id + '/npcs/?q=' + $(this).val(), function (result) {
                    var dummy_npc_list = $('<div class="npc-list noscroll"></div>');
                    console.log(result);
                    for (var c = 0; c < result.length; c++) {
                        var npc = result[c];
                        var npc_item = $('<div class="npc-item noselect"></div>');
                        npc_item.attr('id', 'hb-index-' + c);
                        npc_item.attr('data-npc', JSON.stringify(npc));
                        npc_item
                            .append($('<span class="npc-name"></span>').html(cond(npc.homebrew, '<i class="material-icons">sports_bar</i>', '') + npc.name))
                            .append($('<span class="npc-cr"></span>').text(npc.challenge_rating))
                            .append($('<span class="npc-basics"></span>').text('HP: ' + npc.hit_dice + ' (' + npc.hit_points.max + ') - AC: ' + npc.armor_class.base));
                        if (npc_imgs.includes(npc.name.toLowerCase().replace(/ /g, '-'))) {
                            npc_item.append($('<img class="npc-img">').attr('src', 'assets/npcs/' + npc.name.toLowerCase().replace(/ /g, '-') + '.png'));
                        } else if (npc.image != null && npc.image != '') {
                            npc_item.append($('<img class="npc-img">').attr('src', npc.image));
                        } else {
                            npc_item.append($('<img class="npc-img">').attr('src', 'assets/logo.png'));
                        }
                        npc_item.on('click', function (event) {
                            $('#npc-img-button img').attr('src', $(this).children('img').attr('src'));
                            var npc = JSON.parse($(this).attr('data-npc'));
                            $('#npc-name-inp').val(npc.name);
                            $('#npc-size-select').val(npc.size.toLowerCase());
                            $('#hp-input input').val(npc.hit_points.max);
                            $('#ac-input input').val(npc.armor_class.base);
                            $('#finish-npc').attr('data-npc', $(this).attr('data-npc'));
                        });
                        dummy_npc_list.append(npc_item);
                    }
                    dummy_npc_list.replaceAll('#add-npc-dialog .npc-list');
                });
            }
        });
        $('#npc-img-button').on('click', function (event) {
            $('#npc-img-upload').trigger('click');
        });
        $('#npc-img-upload').on('change', function (event) {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.addEventListener("load", function () {
                $('#npc-img-button img').attr('src', reader.result);
            }, false);

            if (file) {
                reader.readAsDataURL(file);
            }
        });
        $('#run-init').on('click', function (event) {
            if (Object.keys(current_map_data.initiative.combatants).length > 0) {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/initiative/start/',
                    function(){}
                );
            }
        });
        $('#end-init').on('click', function (event) {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/initiative/stop/',
                function(){}
            );
        });
        $('#next-init').on('click', function (event) {
            if (Object.keys(current_map_data.initiative.combatants).length > 0 && current_map_data.initiative.active) {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/initiative/next/',
                    function(){}
                );
            }
        });
        $('#finish-npc').on('click', function (event) {
            if (
                $('#npc-name-inp').val().length == 0 ||
                $('#npc-img-button img').attr('src').length == 0 ||
                $('#hp-input input').val().length == 0 ||
                isNaN(Number($('#hp-input input').val())) ||
                $('#ac-input input').val().length == 0 ||
                isNaN(Number($('#ac-input input').val()))
            ) {
                $(this).animate({ 'background-color': 'red' }, 200);
                window.setTimeout(function () {
                    $('#finish-npc').removeAttr('style');
                }, 1000);
                return;
            }
            if ($(this).attr('data-npc') == '{}') {
                var pos = JSON.parse($(this).attr('data-pos'));
                pos = getPercentPosition(pos.x, pos.y);
                var data = {}
                data.name = $('#npc-name-inp').val();
                data.image = $('#npc-img-button img').attr('src');
                data.hit_points = Number($('#hp-input input').val());
                data.armor_class = Number($('#ac-input input').val());
                data.size = $('#npc-size-select').val();
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                    function () {
                        $('#add-character-dialog').remove();
                    },
                    {}, {
                    object_type: 'npc_basic',
                    data: {
                        player_visible: true,
                        background: true,
                        data: data,
                        dynamic: {
                            hp: data.hit_points,
                            conditions: []
                        }
                    },
                    x: pos.x,
                    y: pos.y
                }
                );
            } else {
                var pos = JSON.parse($(this).attr('data-pos'));
                pos = getPercentPosition(pos.x, pos.y);
                var data = JSON.parse($(this).attr('data-npc'));
                data.name = $('#npc-name-inp').val();
                data.image = $('#npc-img-button img').attr('src');
                data.hit_points.max = Number($('#hp-input input').val());
                data.armor_class.base = Number($('#ac-input input').val());
                data.size = $('#npc-size-select').val();
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/add/',
                    function () {
                        $('#add-character-dialog').remove();
                    },
                    {}, {
                    object_type: 'npc',
                    data: {
                        player_visible: true,
                        background: true,
                        data: data,
                        dynamic: {
                            hp: data.hit_points.max,
                            conditions: []
                        }
                    },
                    x: pos.x,
                    y: pos.y
                }
                );
            }
            $('#add-npc-dialog').animate({ width: 'hide' }, 200);

        });
    }
});