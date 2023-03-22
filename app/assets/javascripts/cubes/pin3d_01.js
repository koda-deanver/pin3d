var scene, camera, orbitControls, renderer;
var cubes = [], cubeObjs = [], outlineObs = [];
var dragControls, transformControls;
var dataurl, imageTexture, imageElement, imgMaterial, hoveredCube;
var email_wall = [new Array(), new Array(), new Array(), new Array(), new Array(), new Array()],
    toEmails      = new Array();

var cube_color = [
  {hue: 0.83, saturation: 1, lightness: 0.50}, //live
  {hue: 0.16, saturation: 1, lightness: 0.50}, //lensed
  {hue: 0.33, saturation: 1, lightness: 0.25}, //food
  {hue: 0.50, saturation: 1, lightness: 0.50}, //real
  {hue: 0,    saturation: 1, lightness: 0.50}, //sell
  {hue: 0.67, saturation: 1, lightness: 0.50}, //
  {hue: 0,    saturation: 0, lightness: 0.50}  //custom
];

var touchtime;

( function () {
  if( hasChild('.cube-canvas-holder') )
    load_init();
}() );

scene = new THREE.Scene();
scene.background = new THREE.Texture(('rgba(255, 255, 255, 0.00001)'));
camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor( 0x000000, 0 );

orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.minPolarAngle = Math.PI / 3;
orbitControls.maxPolarAngle = Math.PI / 3;
orbitControls.enableKeys = false;

setView(renderer);

loadGrid(scene);


setupLights(scene);

camera.position.set(0,5,10);
orbitControls.update();
renderer.render( scene, camera );

animate();

$(document).ready(function() {
  firebase.auth().onAuthStateChanged(function(user) {

    if (user) {

      firebase.database().ref(["Cubes", user.uid].join('/')).once('value')
      .then(function(snapshot) {
        loadCubes(scene, snapshot.val());
      });

      try {
        load_init();
      }
      catch(e){}
      dragControls = new THREE.DragControls(cubes, camera, renderer.domElement);
      hoveredCube = null;
      dragControls.enabled = true;
      animate();

      dragControls.addEventListener( 'hoveron', function(event) {
        orbitControls.enabled = false;
        hoveredCube = event.object;
      });

      dragControls.addEventListener('hoveroff', function(event) {
        orbitControls.enabled = true;
        hoveredCube = null;
      });

      dragControls.addEventListener('dragstart', function(event) {
        orbitControls.enabled = false;
        var cube = event.object;

        notifierVisibility(null);

        $("#text-holder").slideUp(100);

        cube.preposition = {
          x: cube.position.x,
          y: cube.position.y,
          z: cube.position.z
        };

        cube.initposition = {
          x: cube.position.x,
          y: cube.position.y,
          z: cube.position.z
        };

        // $('.visit-cube').attr('href', '/accounts/cubes/' + cube.cubeId);
        $('.visit-cube').attr('href', cube.url);
        is_collab = isCubeCollab(cube.cubeId);
        if (is_collab)
        {
          $('.share-cube').hide();
          // $('.make-favorite').hide();
          $('.edit-name').hide();
          $('.edit-questions').hide();
          $('.remove-cube').hide();
        }
        else
        {
          $('.share-cube').show();
          $('.make-favorite').show();
          $('.edit-name').show();
          $('.edit-questions').show();
          $('.remove-cube').show();  
        }

        var share_cube = $('.share-cube');
        share_cube.attr('data-shared', cube.shared);
        share_cube.attr('ref-cube', cube.cubeId);
        share_cube.text(parseInt(cube.shared) ? 'UNPUBLISH' : 'PUBLISH');

        var fav_cube = $('.make-favorite');
        fav_cube.attr('data-shared', cube.favorite);
        fav_cube.attr('ref-cube', cube.cubeId);
        fav_cube.text(parseInt(cube.favorite) ? 'UNFAVOURITE' : 'FAVOURITE');

        var edit_cube = $('.edit-name');
        edit_cube.attr('ref-cube', cube.cubeId);

        var cube_ques = $('.edit-questions');
        cube_ques.attr('ref-cube', cube.cubeId);

        result = markActiveCube(cube);
        currentCube = result;

        options_body.show();
        options_body.find(".title").text(result.name);
        options_body.find('.remove-cube').attr('ref-cube', cube.cubeId);
        options_body.find('.make-favorite').attr('ref-cube', cube.cubeId);

        colors = ['red','yellow','blue','pink','green','violet','purple','magenta','brown','skyblue','azure','aquamarine','chocolate'];

        x = Math.floor(Math.random() * colors.length);

      });

      dragControls.addEventListener('dragend', function(event) {
        var cube = event.object;

        cube.material.opacity = 1.0;
        orbitControls.enabled = true;

        sameWithCubePos(cube);
      });


      dragControls.addEventListener('drag', function(event) {
        var cube = event.object;

        hoveredCube = null;

        var snapX = Math.floor(cube.position.x);
        var snapY = checkPositionY(cube);
        var snapZ = Math.floor(cube.position.z);

        cube.position.set(snapX, snapY, snapZ);

      });

      window.addEventListener('mousedown', function(event) {
        if(touchtime === 0) {
          touchtime = new Date().getTime();
        } else {
          if(((new Date().getTime())-touchtime) < 180) {
            event.preventDefault();
            
            if(hoveredCube)
              window.location.href = '/accounts/cubes/' + hoveredCube.cubeId;

            touchtime = 0;
          } else {
            touchtime = new Date().getTime();
          }
          
        }
      }, false);


      window.addEventListener('mousemove', function(event) {
        if( !$('.categories.projects').is(':visible') && !$('#cmpltadminModal-32').is(':visible')) {
          if(hoveredCube) {
            event.cubeName    = hoveredCube.name;
            event.cubeDesc    = hoveredCube.description;
            event.cubeCollab  = hoveredCube.isCollab;
            notifierVisibility(event);
          }
          else notifierVisibility(null);
        }
              
      }, false);

      function sameWithCubePos(cube) {
        var prePos  = cube.preposition,
            postPos = cube.position,
            initPos = cube.initposition;

        var x = cube.position.x,
            y = cube.position.y,
            z = cube.position.z;

        cubeOnPos = cubeObjs.filter(function(obj){
          return (obj.cube.position.x == cube.position.x && obj.cube.position.z == cube.position.z && obj.cube.isCollab);
        });


        if((prePos.x !== cube.position.x || prePos.z !== cube.position.z)) {
          if(cubeOnPos.length > 0)
            y -= 1;

          if(y < 1) y = 0.1;

          cubePos = { x: x, y: y, z: z };

          if(!cube.isCollab) {
            updateCube(
              {
                position: cubePos,
                byXZ: [x, z].join('_')
              }, cube.cubeId
            );
          }

          var updateUnCollabCube = matchedCubes({x: cube.position.x, y: -1, z: cube.position.z});
          updateAllCubes(updateUnCollabCube);
        }

        if(prePos.y !== cube.position.y || prePos.x !== cube.position.x || prePos.z !== cube.position.z)
          repoTopCubes(cube.preposition);
      }

      window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, false);


      options_body = $("body").find(".options");
      currentCube = null;

      options_body.on("click", ".edit-name", function() {
        result = currentCube;
        cube = result.cube;

        if(cube.ctype == 2)
          window.location.href = cube.url + "/edit";
        else {
          $('#dialog input').val(cube.name);
          $('textarea').val(cube.description);
          $( "#dialog" ).dialog({
            modal: true,
            open: function(event, ui) {
              $('#dialog input').val(cube.name);
            },
            buttons: {
              'OK': function () {

                  var selectedObject = cube.getObjectByName("name");
                  if(selectedObject != undefined)
                    cube.remove( selectedObject );

                  var name = $('#dialog input').val(),
                      desc = $('#dialog textarea').val();
                  currentCube.cubeName = name;
                  if($.trim(name) !== "") {
                    options_body.find(".title").text(name);

                    var canvas = document.createElement("canvas");

                    var context = canvas.getContext("2d");
                    context.font = "24pt Arial";
                    context.textAlign = "center";
                    context.fillStyle = "black";
                    context.textAlign = "center";
                    context.textBaseline = "middle";

                    context.fillText(name, canvas.width / 2, canvas.height / 2);

                    var texture = new THREE.Texture(canvas);
                    texture.needsUpdate = true;
                    var material = new THREE.MeshBasicMaterial({
                      map : texture, transparent: true
                    });
                    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), material);
                    mesh.position.x = 0;
                    mesh.position.y = 2;
                    mesh.name="name";
                    mesh.lookAt( camera.position );
                    var user = firebase.auth().currentUser;
                    firebase.database().ref(["Cubes", user.uid, cube.cubeId].join('/'))
                    .once('value', function(snapshot) {
                      cub = snapshot.val();
                      var hue = cub.hue,
                          lightness = cub.lightness,
                          saturation = cub.saturation;
                    
                    updateCube({name: name, description: desc,hue: hue,lightness: lightness,saturation: saturation}, cube.cubeId);
                    currentCube.name = name;
                    currentCube.cube.name = name;
                    currentCube.cube.description = desc;
                    $('#dialog textarea').val('');
                    });
                    $(this).dialog('close');
                  } else {
                    alert("Please enter a cube name to update.");
                  }

              },
              'Cancel': function () {
                $(this).dialog('close');
              }
            },
            overlay: "background-color: red; opacity: 0.5"
          });
        }
      });

  
      firebase.database().ref("CubeCollaborators")
      .on('value', function(snapshot){
        var cubes = snapshot.val();
        $.each(cubes, function(cube_id, collabs) {
          if(cube_id == "userId_A") return;
          $.each(collabs, function(collab_id, val) {
            if(collab_id == user.uid) {

              firebase.database().ref(["Cubes", val.owner, cube_id].join('/'))
              .once('value', function(snapshot) {
                var cube = snapshot.val();
                if(cube) {
                  // axes = cube.position.split(',');
                  favorite = collabFavorite(cube_id)
                  var param = {
                    id: cube_id,
                    hue: cube.hue,
                    saturation: cube.saturation,
                    lightness: cube.lightness,
                    axes: {
                      x: cube.position.x,
                      y: cube.position.y,
                      z: cube.position.z
                    },
                    shared: cube.shared ? cube.shared : 0,
                    favorite: favorite ? favorite : 0
                  }

                  isAdded = cubeObjs.filter(function(obj){
                      return (obj.cube.cubeId == cube_id);
                  }).length;

                  if(!isAdded) {
                    appendCube(cube.name, param, null);
                  }
                }
              });   
            } 
          });
        });
      });

      options_body.on("click", ".close-menu", function() {
        var selectedObject = currentCube.cube.getObjectByName("outline");
        currentCube.cube.remove( selectedObject );
        currentCube.isActive = false;
        options_body.hide();
      });

      options_body.on("click", ".remove-cube", function() {
        if(currentCube.cube.ctype == 2)
          window.location.href = currentCube.cube.url;
        else
          $( "#dialog_remove" ).dialog({
            modal: true,
            buttons: {
              'OK': function () {
                var selectedObject = currentCube.cube.getObjectByName("outline"),
                    cubeIdx;

                $.each(cubes, function(cube, cval) {
                  if(currentCube.cube.cubeId === cval.cubeId) cubeIdx = cube;
                });

                currentCube.cube.remove( selectedObject );
                currentCube.isActive = false;
                options_body.hide();
                scene.remove(currentCube.cube);
                currentCube.cube.position.set(0,0,0);
                sameWithCubePos(currentCube.cube);
                cubes.splice(cubeIdx, 1);
                //asdf

                setTimeout(function(){removeCube(currentCube.cube.cubeId);}, 5000)
                

                cubeObjs = $.grep(cubeObjs, function(obj) {
                  return (currentCube.cube.cubeId).localeCompare(obj.cube.cubeId) !== 0;
                });
                $(this).dialog('close');
              },
              'CANCEL': function () {$(this).dialog('close');}
            }
          });
      });

      options_body.on("click", ".share-cube", function() {
        firebase.database().ref(["Terms", "publish"].join('/')).on('value', function(snapshot){
          var collabs     = snapshot.val();
          $('.modal-body p').text(collabs);
        });

        var share_cube  = $(this),
        shared      = parseInt(share_cube.attr('data-shared')) ? 0 : 1,
        cube_id     = $(this).attr('ref-cube'),
        name        = $('.options li .title').text();
        if (shared) {
          $("#myModal").modal({
          });
          $(".submit").click(function(){
            if (document.getElementById('agree').checked) 
              {
                updateCube({shared: shared}, cube_id);
                share_cube.attr('data-shared', shared);
                share_cube.text(shared ? "UNPUBLISH" : "PUBLISH");

                var cube = cubes.filter(function( c ) {
                  return c.cubeId == cube_id;
                });
                cube[0].shared = parseInt(share_cube.attr('data-shared'));

                setTimeout(function() {
                  var refCube = firebase.database().ref(['SharedCubes', cube_id].join('/'));
                  if(shared)
                    refCube.update({name: name, userId: user.uid});
                  else
                    refCube.remove();
                }, Math.floor( 100 + Math.random() * 500 ));
                $("#myModal").modal('hide');
              } 
            else 
              {
                alert('Please check the "agreement" box to continue.');
              }
          });
        }
        else 
        {
          $("#dialog_publish").dialog({
            modal: true,
            buttons: {
              'OK': function () {
                updateCube({shared: shared}, cube_id);
                share_cube.attr('data-shared', shared);
                share_cube.text(shared ? "UNPUBLISH" : "PUBLISH");

                var cube = cubes.filter(function( c ) {
                  return c.cubeId == cube_id;
                });
                cube[0].shared = parseInt(share_cube.attr('data-shared'));
                setTimeout(function() {
                  var refCube = firebase.database().ref(['SharedCubes', cube_id].join('/'));
                  if(shared)
                    refCube.update({name: name, userId: user.uid});
                  else
                    refCube.remove();
                }, Math.floor( 100 + Math.random() * 500 ));
                $(this).dialog('close');
              } ,
              'CANCEL': function () {$(this).dialog('close');}
            }
          });
        }      
      });

      options_body.on("click", ".make-favorite", function(){
        var fav_cube  = $(this),
        favorite      = parseInt(fav_cube.attr('data-shared')) ? 0 : 1,
        cube_id     = $(this).attr('ref-cube'),
        name        = $('.options li .title').text();
        updateCube({favorite: favorite}, cube_id);
        fav_cube.attr('data-shared', favorite);
        fav_cube.text(favorite ? "UNFAVOURITE" : "FAVOURITE")
        var cube = cubes.filter(function( c ) {
          return c.cubeId == cube_id;
        });
        cube[0].favorite = parseInt(fav_cube.attr('data-shared'));
      });
      // END CUBE OPTIONS

      $('#new-project').click(function(e) {
        e.preventDefault();
        $('#edit-questions-popup').slideUp('fast');
        $('#edit-questions-popup .questions-popup').html('');
        var catProj = $('.categories.projects');
        $('#text-holder').slideUp('fast');
        if(catProj.is(':visible')) {
          catProj.slideUp('fast');
          $('#cube-detail-entry').slideUp('fast');
          $('#wall-collab-entry').slideUp('fast');
          $("#assign-question-entry").slideUp('fast');
        }
        else
          catProj.slideDown('fast');
          $('.cube_search').slideUp(100);
      });

      $('#cmpltadminModal-32').on('hidden.bs.modal', function (e) {
        calculatatePercentage($(this), 0);
      });

      $('#btn-assign-walls').click(function() {
        var wall_collab = $("#wall-collab-entry");
        var ques_entry = $("#assign-question-entry");
        if (ques_entry.is(':visible')) {
          ques_entry.slideUp('fast');
        }
        wall_collab.slideToggle('fast');
      });

      $('#btn-assign-questions').click(function() {
        var ques_entry = $("#assign-question-entry");
        var wall_collab = $("#wall-collab-entry");
        var data_parent = '#category-accordion';
        if (wall_collab.is(':visible')) {
          wall_collab.slideUp('fast');
        }

        render_ques_categories(data_parent);

        ques_entry.slideToggle('fast');
      });

      $('.edit-questions').click(function(e){
        e.preventDefault();
        var data_parent = '#edit-category-accordion';
        if ($('#edit-questions-popup').is(':visible')) {
          $('#edit-questions-popup').slideUp('fast');
        }
        else {
          $('#text-holder').slideUp('fast');
          $('.categories.projects').slideUp('fast');
          $('#assign-question-entry').slideUp('fast');
          $('#cube-detail-entry').slideUp('fast');
          $("#category-accordion").html('');
          $('.edit-questions-footer').remove();
          $('#edit-questions-popup').slideDown('fast', function(){
            render_ques_categories(data_parent);
            var user = firebase.auth().currentUser;
            var questions = {}
            firebase.database().ref(['Cubes', user.uid, currentCube.cube.cubeId, 'questions'].join('/')).once('value').then(function(snap){
              $.each(snap.val(), function(key, val) {
                var sel_ques_val = val.split(',');
                if ($('#'+key+' '+'.select-question').length == sel_ques_val.length) {
                  $('#cat-'+key+'checkbox').prop('checked', true);
                }
                $('#'+key+' '+'.select-question').each(function(){
                  var ques_value = $(this).val();
                  if (jQuery.inArray( ques_value, sel_ques_val ) >= 0 ) {
                    $(this).prop('checked', true);
                  }
                });
              });
              $('#edit-questions-popup .row').append('<div class="col-md-12 edit-questions-footer"><div class="col-md-3"></div><div class="col-md-6"><button class="btn btn-default btn-group-justified update-cube-questions" type="button">Update</button></div><div class="col-md-3"></div></div>');
            });
          });
        }  
      });

      $(document).on('click', '.update-cube-questions', function(e){
        e.preventDefault();
        update_cube_questions(currentCube.cube.cubeId);
        $('#edit-questions-popup').slideUp('fast');
        $('.edit-questions-footer').remove();
        $('#edit-category-accordion').html('');
      });

      function render_ques_categories(data_parent){
        firebase.database().ref("questions").once('value').then(function(snap){
          $(data_parent+'.questions-popup').html('');
          $(data_parent+'.questions-popup').append('<div class="col-md-12" style="padding: 0; position: relative;"><button class="btn btn-default btn-group-justified" type="button" style="cursor: default;margin-bottom: 15px;">Questions</button><input type="checkbox" id="select-all-questions" style="position: absolute;right: 5px;top: 6px;"></div>')
          $.each(snap.val(), function(key, val) {
            $(data_parent+'.questions-popup').append(
              '<div class="panel panel-default" style="clear: both;">' +
                '<div class="panel-heading">' +
                  '<h4 class="panel-title" style="position: relative;">' +
                    '<a data-toggle="collapse" data-parent="'+data_parent+'" href="#'+key+'">'+key+'</a>' +
                    '<input type="checkbox" class="select-category" ques-parent="#'+key+'" value="" id="cat-'+key+'checkbox" style="position: absolute;right: 5px;top: 12px;">' +
                  '</h4>' +
                '</div>' +
                '<div id="'+key+'" class="panel-collapse collapse">' +
                  '<div class="panel-body" style="background: #23394b;">' +
                     '<div class="panel-group" id="ques-accordion-'+key+'">' +
                      render_questions(val, key) +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          });
        }).then(function(){
          if (data_parent == '#category-accordion') {
            $('#select-all-questions').prop('checked', true);
            $('.select-question').prop('checked', true);
            $('.select-category').prop('checked', true);
          }
        });
      }

      function render_questions(value, category) {
        var ques_panel = ""
        $.each(value, function(q_key, q_val){
          ques_panel += '<div class="panel panel-default">' +
            '<div class="panel-heading">' +
              '<h4 class="panel-title" style="font-size: 12px;position: relative;padding-right: 20px;">' +
                '<a data-toggle="collapse" data-parent="#ques-accordion-'+category+'" href="#'+category+q_key+'" style="padding: 5px;">'+q_val.text+'</a>' +
                '<input type="checkbox" class="select-question" ques-category="'+category+'" value="'+q_key+'" category-checkbox-id="#cat-'+category+'checkbox" style="position: absolute;right: 5px;top: 10%;">' +
              '</h4>' +
            '</div>' +
            '<div id="'+category+q_key+'" class="panel-collapse collapse">' +
              '<div class="panel-body">'+
                '<ul style="padding: 0 5px;font-size: 12px;">' + 
                  render_answers(q_val.choices) +
                '</ul>' +  
              '</div>' +
            '</div>' +
          '</div>'
        });
        return ques_panel;
      };

      function render_answers(choices) {
        var ans_panel = ""
        $.each(choices, function(key, val){
          ans_panel += '<li style="line-height: normal;">'+val.text+'</li>'
        });
        return ans_panel;
      };

      $(document).on('click', '#select-all-questions', function(){
        if (($(this).is(':checked'))) {
          $('.select-category').prop('checked', true);
          $('.select-question').prop('checked', true);
        }
        else {
          $('.select-category').prop('checked', false);
          $('.select-question').prop('checked', false);
        }  
      });

      $(document).on('click', '.select-category', function(){
        var ques_id = $(this).attr('ques-parent');
        if($(this).is(':checked')){
          $(ques_id).find('.select-question').prop('checked', true);
        } else {
          $(ques_id).find('.select-question').prop('checked', false);
        }
      });

      $(document).on('change', '.select-category', function(){
        if (!($(this).is(':checked'))) {
          $('#select-all-questions').prop('checked', false);
        }
      });

      $(document).on('change', '.select-question', function(){
        var category_checkbox_id = $(this).attr('category-checkbox-id');
        if (!($(this).is(':checked'))) {
          $(category_checkbox_id).prop('checked', false);
          $('#select-all-questions').prop('checked', false);
        }
      });

      $('#btn-create-cube').click(function() {
        var cubeName  = $("#cube-name"),
            cubeDesc = $("#cube-description"),
            loader    = $('#cmpltadminModal-32');

        if( $.trim(cubeName.val()) !== "" ){
          loader.modal('show');

          var addedCube = appendCube(cubeName.val(), null, cubeDesc.val());

          var sendCollabs   = firebase.functions().httpsCallable('sendCubeCollabs'),
              emailVals     = $('input#added-collab').tagsinput('items'),
              currUser      = firebase.auth().currentUser,
              sent_emails   = 0,
              total_emails  = email_wall[0].length + email_wall[1].length,
              percentage    = 0;

          total_emails += email_wall[2].length + email_wall[3].length;
          total_emails += email_wall[4].length + email_wall[5].length;

          $.each(email_wall, function(arraX, value) {
            $.each(value, function(idx, content) {
              sent_emails++;

              var uid = content.key;
              if (uid) {
                var userA = getUserInfo(uid);
                    userB = getUserInfo(currUser.uid);

                Promise.all([userA, userB]).then(function(res) {
                  var collabReq = firebase.database().ref([
                                    'CubeReq', currentCube.cube.cubeId, uid, res[1].userId]
                                  .join('/'));
                  var owner   = [res[1].firstname, res[1].lastname].join(' '),
                      recip   = [res[0].firstname, res[0].lastname].join(' '),
                      appurl  = window.location.origin;

                  collabReq.set({
                    name: owner,
                    image: res[1].image ? res[1].image : '',
                    cube: currentCube.cube.cubeId,
                    cubeName: currentCube.name,
                    wall: content.wall
                  }).then(function() {
                    $.extend(addedCube, { owner: owner, recipient: recip, appurl: appurl});

                    sendCollabs({
                      from: firebase.auth().currentUser.email,
                      to:   res[0].email,
                      cube: addedCube
                    }).then(function(result) {
                      percentage = Math.floor(sent_emails / total_emails * 100);
                      calculatatePercentage(loader, percentage);
                      
                      if(percentage == 100) {
                        $('.categories.projects').slideUp('fast');
                        $('#cube-detail-entry').slideUp('fast');
                        $('#wall-collab-entry').slideUp('fast');

                        $('.categories.projects').slideUp('fast');
                        $('#cube-detail-entry').slideUp('fast');
                        $('#wall-collab-entry').slideUp('fast');
                        setTimeout(function() {
                          loader.modal('hide');
                        }, 1000);

                        toEmails = new Array();
                        email_wall = [
                          new Array(), new Array(), new Array(), 
                          new Array(), new Array(), new Array()
                        ];
                      }
                    });
                  });
                });
              }
              else{
                var userB = getUserInfo(currUser.uid);
                var input_email = content.value.replace(/[^a-zA-Z0-9]/g,'_');
                Promise.all([userB]).then(function(res) {
                  var collabReq = firebase.database().ref([
                                    'CubeReq', currentCube.cube.cubeId, input_email, res[0].userId]
                                  .join('/'));
                  var owner   = [res[0].firstname, res[0].lastname].join(' '),
                      recip   = content.value,
                      appurl  = window.location.origin,
                      url     = appurl + "/accounts/cubes/" + currentCube.cube.cubeId;

                  // console.log(res)

                  collabReq.set({
                    name: owner,
                    image: res[0].image ? res[0].image : '',
                    cube: currentCube.cube.cubeId,
                    cubeName: currentCube.name,
                    wall: content.wall
                  }).then(function() {
                    $.extend(addedCube, { owner: owner, recipient: recip, appurl: appurl, url: url});

                    sendCollabs({
                      from: firebase.auth().currentUser.email,
                      to: content.value,
                      cube: addedCube
                    }).then(function(result) {
                      percentage = Math.floor(sent_emails / total_emails * 100);
                      calculatatePercentage(loader, percentage);
                      if(percentage == 100) {
                        $('.categories.projects').slideUp('fast');
                        $('#cube-detail-entry').slideUp('fast');
                        $('#wall-collab-entry').slideUp('fast');

                        $('.categories.projects').slideUp('fast');
                        $('#cube-detail-entry').slideUp('fast');
                        $('#wall-collab-entry').slideUp('fast');
                        setTimeout(function() {
                          loader.modal('hide');
                        }, 1000);

                        toEmails = new Array();
                        email_wall = [
                          new Array(), new Array(), new Array(), 
                          new Array(), new Array(), new Array()
                        ];
                      }
                    });
                  });
                });
              }  
            });
          });

          calculatatePercentage(loader, 100);
          
          $('.categories.projects').slideUp('fast');
          $('#cube-detail-entry').slideUp('fast');
          $('#wall-collab-entry').slideUp('fast');
          $('#assign-question-entry').slideUp('fast');

          $('.categories.projects').slideUp('fast');
          $('#cube-detail-entry').slideUp('fast');
          $('#wall-collab-entry').slideUp('fast');
          $('#assign-question-entry').slideUp('fast');
          setTimeout(function() {
            loader.modal('hide');
          }, 1000);

          toEmails = new Array();
          email_wall = [
            new Array(), new Array(), new Array(), 
            new Array(), new Array(), new Array()
          ];
        } else {
          alert('Cannot add cube without a name.');
          cubeName.focus();
        }
        cubeName.val('');
        cubeDesc.val('');
      });

      $('#close-asign').click(function() {
        $("#wall-collab-entry").slideUp('fast');
      });

      $('.display-create').click(function(){
        showCreateCube($(this).attr('data-color'), $(this).css('background-color'));
      });


    } else {
      window.location.href = window.location.origin;
    }
  });
});

function showCreateCube(color, btnColor) {
  var cubeDet = $("#cube-detail-entry");

  var cubeDet = $("#cube-detail-entry");

  if(cubeDet.is(':visible')) {
    cubeDet.slideUp(100);
    $('#wall-collab-entry').slideUp(100);
    $('#assign-question-entry').slideUp('fast');
  }
  else {
    cubeDet.slideDown(100);
    $('#btn-create-cube').attr('data-color', color);
  }
}


function repoTopCubes(prevPos) {
  var numcubes = 0, collabCube = false;
  var gridCubes = matchedCubes(prevPos);

  $.each(gridCubes, function(key, value) {
    value.cube.position.y = value.cube.position.y - 1;

    if( value.cube.position.y < 1)
       value.cube.position.y = 0.1;

    if(!value.cube.isCollab)
      updateCube(
        {
          position: {
            x: value.cube.position.x, 
            y: value.cube.position.y, 
            z: value.cube.position.z
          },
          byXZ: [value.cube.position.x, value.cube.position.z].join('_')
        }, value.cube.cubeId);
  });

  var updateUnCollabCube = matchedCubes({x: prevPos.x, y: -1, z: prevPos.z});
  updateAllCubes(updateUnCollabCube);
}

function matchedCubes(pos) {
  return  cubeObjs.filter(function(obj){
              return (obj.cube.position.x == pos.x && obj.cube.position.z == pos.z && obj.cube.position.y > pos.y);
          }).sort(function(a, b) { return a.cube.position.y - b.cube.position.y; } );
}

function updateAllCubes(cubes) {
  var aCollabCubes = 0;
  $.each(cubes, function(key, value) {
    if(value.cube.isCollab) {
      aCollabCubes++;
    }
    var y = value.cube.position.y-aCollabCubes;

    if(y<1) y = 0.1;

    if(!value.cube.isCollab)
      updateCube({
        position: {
          x: value.cube.position.x, 
          y: y, 
          z: value.cube.position.z
        },
        byXZ: [value.cube.position.x, value.cube.position.z].join('_')
      }, value.cube.cubeId);
  });
}


function markActiveCube(cube) {
  var resultObj = cubeObjs.filter(function( obj ) {
    isObj = cube.cubeId === obj.cube.cubeId;

    if(!isObj){
      if(obj.isActive) {
        var selectedObject = obj.cube.getObjectByName("outline");
        obj.cube.remove( selectedObject );
        obj.isActive = false;
      }
    }
    return isObj;
  })[0];


  if(!resultObj.isActive) {
    var geometry = new THREE.BoxGeometry(1.1,1.1,1.1);
    var outlineMaterial1 = new THREE.MeshBasicMaterial( { color: 'white',side: THREE.BackSide } );
    var outlineMesh1 = new THREE.Mesh( geometry, outlineMaterial1 );
    outlineMesh1.name="outline";

    cube.add( outlineMesh1 );

    resultObj.isActive = true;
  }

  return resultObj;
}


function load_init() {
  imageElement = document.createElement('img');
  imageElement.onload = function(e) {
      imageTexture = new THREE.Texture( this );
      imageTexture.needsUpdate = true;
      init();
  };
  imageElement.src = '/assets/pin3dlogo.png';
}


function init(){
  var elemHolder;
  elemHolder = document.getElementsByClassName('cube-canvas-holder')[0];
  elemHolder.appendChild(renderer.domElement);
  imgMaterial = new THREE.MeshBasicMaterial( { map : imageTexture } );
}


function setView(renderer) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);
  if( hasChild('.cube-canvas-holder') )
  document.body.appendChild(renderer.domElement);
}

function loadCubes(scene, ucubes) {
  $.each(ucubes, function(key, val) {
    var geometry = new THREE.BoxGeometry(1,1,1);
    var color = new THREE.Color();
    
    var curColor = color.setHSL(val.hue, val.saturation, val.lightness);

    var materials = [
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ), 
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ), //top
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ), //bottom
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
        new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } )
    ];

    var cube = new THREE.Mesh( geometry, materials );
    // var cubePos = val.position.split(',');
    // var x = parseFloat(cubePos[0]);
    // var y = parseFloat(cubePos[1]);
    // var z = parseFloat(cubePos[2]);
    cube.position.set(val.position.x, val.position.y, val.position.z);
    cube.name=val.name;
    cube.description = val.description ? val.description : '';
    cube.cubeId = key;
    cube.shared = val.shared;
    cube.isCollab = false;
    cube.favorite = val.favorite ? val.favorite : 0;
    cube.url = val.url
    cube.ctype = val.type

    cube.castShadow = true;
    cube.receiveShadow = true;

    scene.add(cube);
    cubes.push(cube);

    var CubeObject = { name: cube.name, color: curColor, index: 0, isActive: false, hasLabel: false,cube: cube, cubeName: "Cube Name" };
    cubeObjs.push(CubeObject);
  });
}


// ADD CUBE
function appendCube(val, currCube, desc) {
  var geometry = new THREE.BoxGeometry(1,1,1);
  var color = new THREE.Color();
  var hue = Math.random(), saturation = 0.25 + Math.random()%0.75,
      lightness = 0.25 + Math.random()%0.75;
  var id, x = 0, y, z = 0, is_collab = currCube ? true : false;

  if(is_collab) {
    hue         = currCube.hue;
    saturation  = currCube.saturation;
    lightness   = currCube.lightness;

    x = currCube.axes.x;
    z = currCube.axes.z;
    y = currCube.axes.y;
  } else {
    var c_idx = parseInt($('#btn-create-cube').attr('data-color'))
    hue         = cube_color[c_idx].hue;
    saturation  = cube_color[c_idx].saturation;
    lightness   = cube_color[c_idx].lightness;
  }

  var curColor = color.setHSL(hue, saturation, lightness);

  var materials = [
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } ),
      new THREE.MeshLambertMaterial( { color: curColor, reflectivity: 1, envMap: null } )
  ];

  var cube = new THREE.Mesh( geometry, materials );

  y = cubeObjs.filter(function(obj){
      return (obj.cube.position.x == x && obj.cube.position.z == z);
  }).length;

  if(y < 1)
    y = 0.1;

  cube.position.set(x, y, z);
  cube.preposition = { x: x, y: y, z: z }
  cube.name=val;
  cube.description = desc;
  if (is_collab){
   cube.favorite = currCube.favorite;
  }
  if(is_collab) id = currCube.id;
  else id = addCube({
      hue:        hue,
      saturation: saturation,
      lightness:  lightness,
      name:       val,
      description: desc,
      position: {
        x: cube.position.x,
        y: cube.position.y,
        z: cube.position.z
      },
      byXZ: [cube.position.x, cube.position.z].join('_'),
      // position:   [cube.position.x, cube.position.y, cube.position.z].join(','),
      shared:     0,
      favorite:   0,
      type: 1,
      created_at: (new Date()).getTime()
    });

  var cubeurl = window.location.origin + '/accounts/cubes/' + id

  updateCube( { url: cubeurl}, id );

  if (id && $('.select-question').is(':checked')) {
    update_cube_questions(id);
  }
  
  cube.cubeId = id;
  cube.shared = is_collab ? currCube.shared : 0;
  cube.isCollab = is_collab;
  cube.url = cubeurl;
  cube.ctype = 1

  cube.castShadow = true;
  cube.receiveShadow = true;

  scene.add(cube);
  cubes.push(cube);


  var CubeObject = { name: cube.name, color: curColor, index: 0, isActive: false, hasLabel: false,cube: cube, cubeName: "Cube Name" };
  cubeObjs.push(CubeObject);

  if(!is_collab) {
    result = markActiveCube(cube);
    
    currentCube = CubeObject;

    options_body.show();
    options_body.find('.title').html(val);
    // options_body.find('.visit-cube').attr('href', '/accounts/cubes/' + id);
    // options_body.find('.visit-cube').attr('href', '/accounts/cubes/' + id);
    options_body.find('.visit-cube').attr('href', cubeurl);
    options_body.find('.remove-cube').attr('ref-cube', id);
    options_body.find('.make-favorite').attr('ref-cube', id);

    var updateUnCollabCube = matchedCubes({x: cube.position.x, y: -1, z: cube.position.z});
    updateAllCubes(updateUnCollabCube);
  } else {
    cube.isActive = false;
  }

  return {
    name: cube.name,
    url:  window.location.origin + '/accounts/cubes/' + id
  };
}

function update_cube_questions(cubeId) {
  if (cubeId) {
    var ques_hash = {};
    $('.select-question:checked').each(function(){
      var ques_category = $(this).attr('ques-category');
      var ques_value = $(this).val();
      if (ques_hash[ques_category]) {
        ques_hash[ques_category] = ques_hash[ques_category]+","+ques_value
      }
      else {
        ques_hash[ques_category] = ques_value
      }
    });
    if (!ques_hash.isEmptyObject) {
      var user = firebase.auth().currentUser;
      firebase.database().ref(['Cubes', user.uid, cubeId, 'questions'].join('/')).remove();
      firebase.database().ref(['Cubes', user.uid, cubeId, 'questions'].join('/')).update(ques_hash);
    }
  }  
}

function isCubeCollab (cube_id) {
 var is_collab = 0;
  firebase.database().ref(["CubeCollaborators", cube_id].join('/')).on('value', function(snapshot){
    var collabs     = snapshot.val();
    var user = firebase.auth().currentUser;
    $.each(collabs, function(collab, prop) {
      if (user.uid == collab)
        is_collab = 1;
    });
  });
  return is_collab;
}

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadGrid(scene) {
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3( -5.5, 0, -5 ) );
  geometry.vertices.push(new THREE.Vector3( 5.5, 0, -5 ) );

  for ( var i = 0; i <= 11; i ++ ) {
    var meshX = lineMesh(geometry);
    meshX.position.z = ( (i-1) + 0.5 );
    meshX.position.y = -0.5;
    scene.add( meshX );

    var meshY = lineMesh(geometry);
    meshY.position.x =  ( (i-1) + 0.5 );
    meshY.rotation.y = 90 * Math.PI / 180;
    meshY.position.y = -0.5;
    scene.add( meshY );

  }
}

function lineMesh(geometry) {
  var line = new MeshLine();
  line.setGeometry( geometry );
  line.setGeometry( geometry, function( p ) { return 2; } ); // makes width 2 * lineWidth
  var material = new MeshLineMaterial( {
    useMap: false,
    color: new THREE.Color( 0xffffff ),
    opacity: 1,
    resolution:  new THREE.Vector2( window.innerWidth, window.innerHeight ),
    sizeAttenuation: false,
    lineWidth: 2.5,
    near: camera.near,
    far: camera.far
  });
  return new THREE.Mesh( line.geometry, material );
}

function snapToGrid(cube) {
  var current_position = cube.position;
  var snapX = Math.floor(current_position.x);
  var snapY = Math.floor(current_position.y);
  var snapZ = Math.floor(current_position.z);
  cube.position.set(snapX, snapY, snapZ);
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  renderer.render( scene, camera );

  for(var k=0;k<outlineObs.length;k++){
    outlineObs[k].lookAt( camera.position );
  }
}

function setupLights(scene) {
  particleLight = new THREE.Mesh( new THREE.SphereBufferGeometry( 500, 500, 500 ), new THREE.MeshBasicMaterial( { color: 0xf0fffff, transparent: true } ) );
  scene.add( particleLight )

  scene.add( new THREE.AmbientLight( 0x222222 ) );

  var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
  directionalLight.position.set(0,100,0).normalize();
  directionalLight.castShadow = true;
  scene.add( directionalLight );


  var pointLight1 = new THREE.PointLight( 0xffffff, 0.9, 500 );
  pointLight1.position.set(0, 5, 100)
  particleLight.add( pointLight1 );

  var pointLight2 = new THREE.PointLight( 0xffffff, 0.9, 500 );
  pointLight2.position.set(0, 5, -100)
  particleLight.add( pointLight2 );

  var pointLight3 = new THREE.PointLight( 0xffffff, 0.9, 500 );
  pointLight3.position.set(-100, 5, 0)
  particleLight.add( pointLight3 );

  var pointLight4 = new THREE.PointLight( 0xffffff, 0.9, 500 );
  pointLight4.position.set(100, 5, 0)
  particleLight.add( pointLight4 );
}

function checkPositionY(curCube){
  var posY = 0.1;
  curCubeX = Math.floor(curCube.position.x);
  curCubeZ = Math.floor(curCube.position.z);

  var resCubes = cubes.filter(function( c ) {

    cubeX = Math.floor(c.position.x);
    cubeZ = Math.floor(c.position.z);

    return (cubeX == curCubeX && cubeZ == curCubeZ);
  });

  for(var k=0;k<resCubes.length; k++){
    cube = resCubes[k];
    cubeX = Math.floor(cube.position.x);
    cubeZ = Math.floor(cube.position.z);

    if(cubeX == curCubeX && cubeZ == curCubeZ && (cube.cubeId).localeCompare(curCube.cubeId) != 0) {
      if(posY <= Math.floor(cube.position.y + 1))
        posY = Math.floor(cube.position.y + 1);
    }
  }

  return posY;
}

function hasChild(childElem) {
  return $(document).has(childElem).length > 0;
}
