var sid = null;

function load_character(data) {
    console.log(data);
    $('title').text(data.name);
    $('#panel-definition .title span').text(data.name);
}

function pagelocal_update(data) {
    if (data.updates.characters[sid]) {
        get('/character/'+sid,load_character);
    }
}

$(document).ready(function(){
    var params = parse_query_string();
    if (params.sheet==undefined) {
        window.location = '/characters';
        return;
    }
    sid = params.sheet;
    get('/character/'+params.sheet,load_character).fail(function(data){
        bootbox.alert(data.responseJSON.result,function(){window.location = '/characters';});
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