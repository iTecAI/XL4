var sid = null;

function load_update_directs(data) {
    $('.panel .content .update').each(function (i, e) {
        var path = $(this).attr('data-path').split('.');
        var current = data;
        for (var p = 0; p < path.length; p++) {
            current = current[path[p]];
            if (current == undefined) {
                break;
            }
        }
        if (current != undefined) {
            $(this).children('input').val(current);
        }
    });
}

function setup_direct_event_listeners() {
    $('.panel .content .input.direct input').on('change',function(event){
        if ($(event.target).val().length > 0 || $(event.target).parent('.input.direct').hasClass('allowedEmpty')) {
            if (isNaN($(event.target).val())) {
                var val = $(event.target).val();
            } else {
                var val = Number($(event.target).val());
            }
            post('/character/'+sid+'/modify/',console.log,{},{
                path:$(event.target).parent('.input.direct').attr('data-path'),
                value:val
            });
        }
    });
}

function load_character(data) {
    console.log(data);
    $('title').text(data.name);
    $('#panel-definition .title span').text(data.name);
    load_update_directs(data);

    setup_direct_event_listeners()
}

function pagelocal_update(data) {
    console.log(data.updates);
    if (data.updates.characters.specific[sid]) {
        get('/character/' + sid, load_character);
    }
}

$(document).ready(function () {
    var params = parse_query_string();
    if (params.sheet == undefined) {
        window.location = '/characters';
        return;
    }
    sid = params.sheet;
    get('/character/' + params.sheet, load_character).fail(function (data) {
        bootbox.alert(data.responseJSON.result, function () { window.location = '/characters'; });
    });
    $('#panel-container').masonry({
        itemSelector: '.panel',
        horizontalOrder: true,
        percentPosition: true,
        isResizable: true,
        transitionDuration: 0,
        containerStyle: null
    });
});