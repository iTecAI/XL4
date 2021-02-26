function draw_obscure(obj) {
    return $('<div class="object obscure"></div>')
        .toggleClass('dm', current_cmp_data.dms.includes(uid))
        .attr('data-oid', obj.id)
        .css({
            top: obj.position.y + '%',
            left: obj.position.x + '%',
            width: obj.data.width + '%',
            height: obj.data.height + '%'
        })
        .on('click', function (event) {
            if (event.button != 0) {
                return;
            }
            if (current_tool == 'obscure') {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/delete/',
                    function () { }
                );
            }
        })
        .on('ctx:delete', function (event) {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/delete/',
                function () { }
            );
        });
}

function draw_note(obj) {
    if (!obj.data.player_visible && !current_cmp_data.dms.includes(uid)) {
        return;
    }
    var note = $('<span class="note-content" contenteditable="true"></span>')
        .text(obj.data.content);

    return $('<div class="object note" data-moving="false"></div>')
        .append(note)
        .css({
            color: obj.data.color,
            top: obj.position.y + '%',
            left: obj.position.x + '%'
        })
        .attr('data-oid', obj.id)
        .toggleClass('player-visible', obj.data.player_visible)
        .toggleClass('player-invisible', !obj.data.player_visible)
        .on('mousemove', function (e) {
            if (current_tool == 'note' && current_cmp_data.dms.includes(uid)) {
                $('.note').attr('contenteditable', 'true');
            } else {
                $('.note').attr('contenteditable', 'false');
            }
            if ($(this).attr('data-moving') == 'true') {
                var pos = getPercentPosition(e.clientX, e.clientY);
                $(this).css({
                    top: pos.y + '%',
                    left: pos.x + '%'
                });
            }
        })
        .on('mousedown', function (event) {
            if (event.button == 0) {
                if (current_tool == 'move' && current_cmp_data.dms.includes(uid)) {
                    $(this).attr('data-moving', 'true');
                }
            }
        })
        .on('mouseup', function (event) {
            if ($(this).attr('data-moving') != 'true') {
                return;
            }
            $(this).attr('data-moving', 'false');
            var pos = getPercentPosition(event.clientX, event.clientY);
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/move/',
                function () { },
                {}, pos
            );
        })
        .on('blur paste', function (event) {
            if ($(this).children('.note-content').text().length == 0) {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/delete/',
                    function () { }
                );
            } else {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/modify/',
                    function () { },
                    {}, {
                    path: 'content',
                    value: $(this).children('.note-content').text()
                }
                );
            }
        })
        .on('keypress', function (event) {
            if (event.originalEvent.key == 'Enter') {
                event.preventDefault();
                $(this).trigger('click');
            }
        })
        .on('ctx:delete', function () {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/delete/',
                function () { }
            );
        })
        .on('ctx:visibility_off', function () {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                function () { }, {}, {
                path: 'player_visible',
                value: false
            }
            );
        })
        .on('ctx:visibility_on', function () {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                function () { }, {}, {
                path: 'player_visible',
                value: true
            }
            );
        })
        .on('ctx:color_cycle', function () {
            if (note_colors.indexOf(current_map_data.objects[$(this).attr('data-oid')].data.color) == note_colors.length - 1) {
                var c = note_colors[0];
            } else {
                var c = note_colors[note_colors.indexOf(current_map_data.objects[$(this).attr('data-oid')].data.color) + 1];
            }
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                function () { }, {}, {
                path: 'color',
                value: c
            }
            );
        });
}

function draw_shape(obj) {
    if (!obj.data.player_visible && !current_cmp_data.dms.includes(uid)) {
        return;
    }
    if (obj.data.shape_type == 'rectangle' || obj.data.shape_type == 'circle') {
        return $('<div class="object shape"></div>')
            .addClass(obj.data.shape_type)
            .toggleClass('dm', current_cmp_data.dms.includes(uid))
            .attr('data-oid', obj.id)
            .css({
                top: obj.position.y + '%',
                left: obj.position.x + '%',
                width: obj.data.width + '%',
                height: obj.data.height + '%',
                'background-color': obj.data.color
            })
            .on('ctx:delete', function (event) {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/delete/',
                    function () { }
                );
            })
            .append(
                $('<span class="measurement"></span>')
                    .text(
                        String(Math.round(obj.data.width * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100)) +
                        ' x ' +
                        String(Math.round(obj.data.height * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100))
                    )
            )
            .toggleClass('player-visible', obj.data.player_visible)
            .toggleClass('player-invisible', !obj.data.player_visible)
            .on('mousemove', function (e) {
                if ($(this).attr('data-moving') == 'true') {
                    var pos = getPercentPosition(e.clientX, e.clientY);
                    $(this).css({
                        top: pos.y + '%',
                        left: pos.x + '%'
                    });
                }
            })
            .on('mousedown', function (event) {
                if (event.button == 0) {
                    if (current_tool == 'move') {
                        $(this).attr('data-moving', 'true');
                    }
                }
            })
            .on('mouseup', function (event) {
                if ($(this).attr('data-moving') != 'true') {
                    return;
                }
                $(this).attr('data-moving', 'false');
                var pos = getPercentPosition(event.clientX, event.clientY);
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/move/',
                    function () { },
                    {}, pos
                );
            })
            .on('ctx:visibility_off', function () {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                    function () { }, {}, {
                    path: 'player_visible',
                    value: false
                }
                );
            })
            .on('ctx:visibility_on', function () {
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                    function () { }, {}, {
                    path: 'player_visible',
                    value: true
                }
                );
            })
            .on('ctx:color_cycle', function () {
                if (note_colors.indexOf(current_map_data.objects[$(this).attr('data-oid')].data.color) == note_colors.length - 1) {
                    var c = note_colors[0];
                } else {
                    var c = note_colors[note_colors.indexOf(current_map_data.objects[$(this).attr('data-oid')].data.color) + 1];
                }
                post(
                    '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                    function () { }, {}, {
                    path: 'color',
                    value: c
                }
                );
            });
    }
}

function draw_character(obj) {
    return $('<div class="object character token"></div>')
        .toggleClass('owned', uid == obj.data.owner)
        .attr('data-oid', obj.id)
        .attr('data-cid', obj.data.char_id)
        .addClass(cond(obj.data.background, 'background', 'no-background'))
        .append(
            $('<span class="char-token"></span>')
                .append($('<img>').attr('src', cond(
                    current_cmp_data.character_data[obj.data.char_id].appearance.image == null,
                    'assets/logo.png',
                    current_cmp_data.character_data[obj.data.char_id].appearance.image
                )))
        )
        .append($('<span class="char-name"></span>').text(current_cmp_data.character_data[obj.data.char_id].name))
        .css({
            top: obj.position.y + '%',
            left: obj.position.x + '%'
        })
        .on('mousemove', function (e) {
            if ($(this).attr('data-moving') == 'true') {
                var pos = getPercentPosition(e.clientX, e.clientY);
                $(this).css({
                    top: pos.y + '%',
                    left: pos.x + '%'
                });
            }
        })
        .on('mousedown', function (event) {
            if (event.button == 0 && ($(this).hasClass('owned') || current_cmp_data.dms.includes(uid))) {
                if (current_tool == 'move') {
                    $(this).attr('data-moving', 'true');
                }
            }
        })
        .on('mouseup', function (event) {
            if ($(this).attr('data-moving') != 'true') {
                return;
            }
            $(this).attr('data-moving', 'false');
            var pos = getPercentPosition(event.clientX, event.clientY);
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(event.delegateTarget).attr('data-oid') + '/move/',
                function () { },
                {}, pos
            );
        })
        .on('ctx:delete', function (event) {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/delete/',
                function () { }
            );
        })
        .on('ctx:edit', function (event) {
            window.open('/character_sheet?sheet=' + $(event.delegateTarget).attr('data-cid'), '_blank');
        })
        .on('ctx:enable_background', function () {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                function () { }, {}, {
                path: 'background',
                value: true
            }
            );
        })
        .on('ctx:disable_background', function () {
            post(
                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).attr('data-oid') + '/modify/',
                function () { }, {}, {
                path: 'background',
                value: false
            }
            );
        });
}

function draw_objects() {
    var objects = [];
    var object_keys = Object.keys(current_map_data.objects);
    for (var o = 0; o < object_keys.length; o++) {
        var obj = current_map_data.objects[object_keys[o]];
        switch (obj.type) {
            case 'obscure':
                objects.push(draw_obscure(obj));
                break;
            case 'note':
                objects.push(draw_note(obj));
                break;
            case 'shape':
                objects.push(draw_shape(obj));
                break;
            case 'character':
                objects.push(draw_character(obj));
                break;
        }
    }
    return objects;
}