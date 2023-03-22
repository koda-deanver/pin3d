$(document).ready(function(){
  body = $("body");
  cube_box = body.find(".cube-box");
  dashboard_box = body.find(".dashboard");

  body.on("click", ".page-sidebar li", function(){
    li = $(this);
    if(!li.hasClass("open")) {
      body.find(".page-sidebar li").removeClass("open");
      li.addClass("open");
      if(li.hasClass("cubes")){
        cube_box.show();
        dashboard_box.hide();
        if($('.cube-canvas-holder').has('canvas').length <  1)
          load_init();
        // cube_box.find(".cube-canvas").attr("src","/cubes/cube");
      }
      else if(li.hasClass("home")){
        cube_box.hide();
        dashboard_box.show();
      }
    }
  });

  cube_box.on("click", ".close_box", function(){
    body.find(".page-sidebar .cubes").removeClass("open");
    cube_box.hide();
    cube_box.find(".cube-canvas").contents().remove();
  });
});