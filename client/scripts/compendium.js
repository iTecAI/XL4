function processCompendiumListing(data) {
    console.log(data);
    if (data.length == 0) {
        $('#no-content-image').show();
        $('#compendium-area').html('');
        return;
    }
    if (data.length > 60) {
        data = data.slice(0,59);
    }
    $('#no-content-image').hide();
    dummy_area = $('<div></div>');

    for (var i=0;i<data.length;i++) {
        var item = data[i].data;
        var endpoint = data[i].endpoint;
        if ($(dummy_area).children('#compendium-category-'+endpoint).length == 0) {
            $(dummy_area).append(
                $('<div></div>')
                .attr('id','compendium-category-'+endpoint)
                .addClass('compendium-category')
                .append(
                    $('<div class="title noselect"></div>').append(
                        $('<span></span>').text(firstUpper(endpoint))
                    )
                )
                .append('<div class="items"></div>')
            );
        }
        if (endpoint == 'monsters') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_creature(item));
        }
    }

    $('#compendium-area').html(dummy_area);
}

$(document).ready(function(){
    $('.content-type').on('click',function(event){
        $('.content-type[data-type='+$(this).attr('data-type')+']').toggleClass('type-selected');
        var selected = $.map($('.content-type.type-selected').toArray(),function(e,i){
            return $(e).attr('data-type');
        });
        if ($('#compendium-search').val().length > 0 && selected.length > 0) {
            post('/compendium/categories/',processCompendiumListing,{search:$('#compendium-search').val()},{cats:selected});
        } else {
            $('#no-content-image').show();
            $('#compendium-area').html('');
        }
    });
    $('#compendium-search').on('change',function(event){
        var selected = $.map($('.content-type.type-selected').toArray(),function(e,i){
            return $(e).attr('data-type');
        });
        if ($('#compendium-search').val().length > 0 && selected.length > 0) {
            post('/compendium/categories/',processCompendiumListing,{search:$('#compendium-search').val()},{cats:selected});
        } else {
            $('#no-content-image').show();
            $('#compendium-area').html('');
        }
    });
});