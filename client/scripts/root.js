$(document).ready(function(){
    $('#head-menu-btn').on('click',function(){
        $('#side-bar').toggleClass('active');
        $('#content-modal').toggleClass('active');
    });
});