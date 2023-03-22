var camera, controls, renderer, scene, raycaster, mouse, dragControls,
      intersected = null, intersects, lookAtVector, skyBox, domElement;

var txtMaterials, txtMesh, columns = 6, rows = 4, faceArea = columns * 10;

var linkContainerW = (faceArea * 2 / columns) - 1,
    linkContainerH = (faceArea * 2 / rows) - 1.5;

var txtLink, emojiRow, changeableEmoji, onloadEmoji = false;

var firstWall = 1, leftWall = 1, rightWall = 1, backWall = 1,
    ceiling = 1, currentFace=-1, floor=1, wallPosts, currentWall = undefined;

var success = false, img,
    defaultImage  = window.location.origin + "/assets/post_placeholder.png",
    addImage      = 'https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/object_cube.png';

var touchtime, aMobile;

var disableChangeFace = true, links = [], emptylinks = 0, face1pos;

var rotate_room = undefined, HazimuthAngle, prevFace = undefined, ownerStat = undefined;

var innerHeight, innerWidth;



$('document').ready(function() {
  console.warn = function() {};
  aMobile = isMobile();

  if (Detector.webgl) {
    init();
    animate();
  }
  else {
    var warning = Detector.getWebGLErrorMessage();
    document.getElementsByTagName('info').appendChild(warning);
  }


  $('.container canvas').blur(function(){
    alert('canvas focus');
  });


  txtLink.click(function(){
    $(this).focus();
  })
  .focusout(function(){
  })
  .keypress(function(e){
    if(e.keyCode == 32){
      e.preventDefault();
    }
  });

  $(window).on('keyup', function(e){
    if(e.keyCode == 16){
      if(!txtLink.is(':focus')) {
        $(".info").slideToggle(100);
        $('#text-holder').slideUp(100);
        txtLink.removeAttr('add-to-wall');
      }
    }
  });


  txtLink.on('keyup', function(e){
    if(e.keyCode == 13){
      var url = $.trim($(this).val());
      $(this).blur();

      if($(this).attr('add-to-wall'))
        fetchLinkDetails(null, parseInt($(this).attr('add-to-wall')), false, null);
      else
        fetchLinkDetails(null, null, false, null);
      txtLink.attr('disabled', true);
    } else if(e.keyCode == 18) {
      $('#text-holder').slideUp(100);
      txtLink.removeAttr('add-to-wall');
    }
  });

  $('i[data-edit-wall]').click(function() {
    var edit_btn = $(this);
    var edit_wall = parseInt(edit_btn.attr('data-edit-wall')),
        name_wall;

    rotate_room = edit_wall;
    wallRotation();

    $( "#dia_update_wall" ).dialog({
      modal: true,
      open: function(event, ui) {
        switch(edit_wall) {
          case 0: name_wall = "Magenta"; break;
          case 1: name_wall = "Red"; break;
          case 2: name_wall = "Cyan"; break;
          case 3: name_wall = "Blue"; break;
          case 4: name_wall = "Yellow"; break;
          case 5: name_wall = "Green"; break;
        }

        $(this).find('.form-group label strong').text(name_wall + ' Wall:');
      },
      buttons: {
        'OK': function () {
          var name_txt = $(this).find('input').val();

          var wall_name_sel = 'a.wall-link[data-wall="' + edit_wall + '"]';
          wall_name_sel += ', a.collab-link[data-wall="' + edit_wall + '"]';

          $(wall_name_sel).find('span.wall-name').text(name_txt);
          $(wall_name_sel).find('span.demo-box').css("display", "inline");
          var update_val = { [edit_wall]: name_txt };

          var owner = edit_btn.attr('data-cube');

          editWallName(update_val, cube_id, owner);

          $(this).find('input').val('');
          $(this).dialog('close');
        },
        'Cancel': function () {
          $(this).dialog('close');
        }
      }
    });
  })


  $('#container canvas').click(function(){
    if(!aMobile) $('#txt-link').blur();
  });

  // $('#container canvas').dblclick(function(){
  //   console.log(currentFace)
  // });

  $('button[name="logout"]').click(function(){
    signOutUser();
  });


  function init() {
    txtLink = $('#txt-link');
    var container = document.getElementById('container');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.setSize($('#rooms').width(), window.innerHeight - 90);
    if(container)
      container.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(93, 4/3, 0.1, 1000);
    camera.position.z = 0.0000001;

    raycaster = new THREE.Raycaster();
    mouse     = new THREE.Vector2();

    controls      = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotateSpeed = 75;

    dragControls  = new THREE.DragControls(links, camera, renderer.domElement);
    dragControls.enabled = true;

    domElement = renderer.domElement.getBoundingClientRect();

    emojiRow = new THREE.Vector2();

    var materials = [
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xDD42FA, opacity: 0.75, transparent: true }), //right 0xDD42FA
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xDC2B03, opacity: 0.75, transparent: true }), //left 0xDC2B03
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8FFDFF, opacity: 0.75, transparent: true }), //top 0x8FFDFF
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x010066, opacity: 0.75, transparent: true }), //floor 0x010066
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xFEFB3B, opacity: 0.75, transparent: true }), //front 0xFEFB3B
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8DF93A, opacity: 0.75, transparent: true })  //back 0x8DF93A
    ];

    var room = new THREE.Mesh(new THREE.CubeGeometry(faceArea, faceArea, faceArea), materials);
    room.applyMatrix(new THREE.Matrix4().makeScale(10,10,-10));
    scene.add(room);
    room.material.side = THREE.BackSide;

    lookAtVector = new THREE.Vector3(0,0, 0.0000001);
    lookAtVector.applyQuaternion(camera.quaternion);

    var mainLight = new THREE.PointLight( 0x00ff00, 1.5, 250 );
    mainLight.position.y = 0;
    scene.add( mainLight );

    var redLight = new THREE.PointLight( 0xff0000, 0.25, 5 );
        redLight.position.set( 0, 0, 0 );
        scene.add( redLight );

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    window.addEventListener('mousedown', onMouseDown, false);

    dragControls.addEventListener( 'hoveron', onHoverOn);

    dragControls.addEventListener('hoveroff', onHoverOff);
    dragControls.addEventListener('drag', onDragLink);

    dragControls.addEventListener('dragstart', onDragStart);
    dragControls.addEventListener('dragend', onDragEnd);
    container.addEventListener('contextmenu', onContextMenu);


    $('.panel .add-new-link').click(function(e) {
      e.preventDefault();
      $(".info").slideUp(100);
      $('#add-collab-holder').slideUp(100);
      $('#text-holder').slideDown(100);
      txtLink.attr('add-to-wall', $(this).attr('data-wall'));
      txtLink.focus();
    });

    $('#text-holder h4 i').click(function() {
      $('#text-holder').slideUp(100);
      txtLink.removeAttr('add-to-wall');
      txtLink.val('');
    });


    $('#walls-holder .panel, #collabs-holder .panel').on('show.bs.collapse', function() {
      if($('.info').is(':visible'))
        $('.info').slideUp(100);

      $('#text-holder').slideUp(100);
      $('#add-collab-holder').slideUp(100);

      controls.maxAzimuthAngle = Math.PI;
      rotate_room = parseInt($(this).attr('data-wall'));
      wallRotation();

      $(this).find('i.fa-chevron-right').removeClass('fa-chevron-right').addClass('fa-chevron-down');
    }).on('hidden.bs.collapse', function() {
      $(this).find('i.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-right');
      $('#add-collab-holder').slideUp(100);
    });


    $('.add-collab').click(function(e) {
      e.preventDefault();
      $(".info").slideUp(100);
      $('#text-holder').slideUp(100);
      $('#add-collab-holder').slideDown(100);
      $('#txt-add-collab').attr('data-wall', $(this).attr('data-wall')).focus();
    });


    $('#add-collab-holder h4 i').click(function() {
      $('#add-collab-holder').slideUp(100);
    });


    $('#emoji-row').find('.link-category').bind('click', function() {
      var type = $(this).data('category');
      $("#emoji-row").slideUp(200);
      onloadEmoji = true;

      var storage     = firebase.storage();
      var ref_storage = storage.ref(['emojis', type + '.png'].join('/'));

      ref_storage.getDownloadURL().then(function(url) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.onload = function(event) {
          var blob = xhr.response;

          var reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function() {
            base64data = reader.result;
            changeableEmoji.object.material.map = THREE.ImageUtils.loadTexture( base64data );
            changeableEmoji.object.material.needsUpdate = true;
            onloadEmoji = false;

            var linkCont  = changeableEmoji.object.parent.children;
            var link_id   = getObjectByContName(linkCont, "metaholder").linkId;
            updateLinkToRecord({type: type}, cube_id, link_id);

            changeableEmoji = null;
          };
        };
        xhr.open('GET', url);
        xhr.send();
      });

      dragControls.enabled = true;
      controls.enabled = true;
      controls.reset();
    });

    $('#upload-content').click(function() {
      $(this).next().children('input').trigger('click');
    });

    $('#file-uploader').change(function() {
      var input = $(this)[0];

      if( input.files && input.files[0] ) {
        var knobloader = $('input.knob');

        var storRef     = firebase.storage().ref();
        var currUser    = firebase.auth().currentUser.uid;
        var id          = firebase.database().ref().child('Links/' + cube_id).push().key;
        var to_wall     = parseInt(txtLink.attr('add-to-wall'));

        var file = input.files[0];

        var filename    =  file.name;
        var date = $.datepicker.formatDate('mm/dd/yy', file.lastModifiedDate),
            ext  = file.type.split('/'),
            extn = file.name.split('.');

        var filext =  extn[extn.length - 1];

        if(file.name.indexOf('.key.zip') >= 0) {
          filext =  extn[extn.length - 2];
          filename = extn[0] + '.' + filext;
        }

        // console.log(filename);

        var name = token() + '.' + filext;

        var allowed     = ['video', 'image', 'audio', 'text'];
        var allowedApp  = [
          'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'vnd.openxmlformats-officedocument.wordprocessingml.document',
          'vnd.openxmlformats-officedocument.presentationml.presentation',
          'postscript', 'xls', 'indd', 'msword', 'zip', 'x-rar', 'rar', 'pdf',
          'vnd.oasis.opendocument.spreadsheet', 'plain', 'rtf', 'x-latex',
          'vnd.oasis.opendocument.text', 'vnd.ms-powerpoint',
          'x-iwork-keynote-sffkey', 'vnd.oasis.opendocument.presentation'
        ];

        if(ext.length < 2) {
          if(filext == "xls" || filext == "xlr") {
            ext[0] = 'application';
            ext[1] = allowedApp[0];
          } else if(filext == "tex" || filext == 'wks' || filext == "wps" || filext == 'wpd') {
            ext[0] = 'application';
            ext[1] = 'x-latex';
          }
        } else if(ext[1] == 'octet-stream' && filext == 'indd') {
          ext[1] = filext;
        }

        if(file.size > 8000000) {
          $("button.messenger-close").trigger('click');
          showErrorMessage("File size must not exceed 8Mb.");
          $(this).wrap('<form>').closest('form').get(0).reset();
          $(this).unwrap();
          return 0;
        }

        if($.inArray(ext[0], allowed).length < 0) {
          if($.inArray(ext[1], allowedApp).length < 0) {
            $("button.messenger-close").trigger('click');
            showErrorMessage("Uploaded file is not supported.");
            $(this).wrap('<form>').closest('form').get(0).reset();
            $(this).unwrap();
            return 0;
          }
        }

        knobloader.val('0%');
        knobloader.trigger('change');
        $('#text-holder').slideUp(100);
        $('#modalUpload').modal('show');

        uploadtask = storRef.child(['PinFiles', cube_id, id, name].join('/')).put(file, {type: file.type});

        uploadtask.on('state_changed', function(snapshot) {
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          knobloader.val(progress + '%');
          knobloader.trigger('change');
        }, function(error) {
          console.log(error);
        },
        function() {
          uploadtask.snapshot.ref.getDownloadURL().then(function(downloadUrl) {
            
            var f_val = {
                  id: id,
                  name: filename,
                  date: date,
                  size: file.size,
                  wall: to_wall,
                  url: downloadUrl,
                  token_name: name
                };

            // console.log(f_val);

            alert(ext[0])

            if(ext[0] == 'image') {
              if(filext == 'psd')
                pinFileIcon(filext + '.jpg', f_val);
              else
                addPinFile(id, filename, date, file.size, file, to_wall, downloadUrl, name);
            } else if(ext[0] == 'video') {
              pinFileIcon('video.png', f_val);
            } else if(ext[0] == 'audio' || filext === 'wpl') {
              pinFileIcon('audio.jpg', f_val);
            }else if(ext[0] === "application") {
              if(ext[1].indexOf('spreadsheet') !== -1) {
                pinFileIcon('excel.jpg', f_val);
              } else if(ext[1].indexOf('xls') !== -1) {
                pinFileIcon('excel.jpg', f_val);
              } else if (ext[1].indexOf('wordprocessingml') !== -1 || ext[1].indexOf('msword') !== -1) {
                pinFileIcon('word.png', f_val);
              } else if (ext[1].indexOf('presentationml') !== -1 || ext[1].indexOf('ms-powerpoint') !== -1) {
                pinFileIcon('powerpoint.jpg', f_val);
              } else if (ext[1].indexOf('presentation') !== -1) {
                pinFileIcon('odp.jpg', f_val);
              }else if (ext[1] == "postscript") {
                if(filext == "ai") pinFileIcon(filext + '.jpg', f_val);
                else pinFileIcon('image.jpg', f_val);
              } else if(ext[1] == "indd") {
                if(filext == "indd") pinFileIcon(filext + '.jpg', f_val);
              } else if(ext[1] == "zip") {
                pinFileIcon(filext + '.jpg', f_val);
              } else if(ext[1].indexOf("rar") !== -1) {
                pinFileIcon(filext + '.jpg', f_val);
              } else if(filext[1].indexOf("opendocument.text") !== -1 ) {
                pinFileIcon('doc.jpg', f_val);
              } else if(filext[1].indexOf("keynote") !== -1 ) {
                pinFileIcon('key.jpg', f_val);
              } else if(ext[1].indexOf("pdf") !== -1) {
                pinFileIcon(filext + '.jpg', f_val);
              } else if(ext[1].indexOf("latex") !== -1) {
                pinFileIcon('doc.jpg', f_val);
              }
            } else if(ext[0] === "text") {
                pinFileIcon('txt.jpg', f_val);
            }

            $('#modalUpload').modal('hide');
          });
        });

        
        $(this).wrap('<form>').closest('form').get(0).reset();
        $(this).unwrap();
      }
    });

    // firebase.database().ref("Links/" + cube_id).on('value', function(link_snap){
    //   var group_conts = scene.children.filter(function( l ) {
    //     return (l.type == "Group");
    //   });

    //   $.each(link_snap.val(), function(key, value){
    //     var has_match = false;
    //     $.each(group_conts, function(gc_k, gc) {

    //       $.each(gc.children, function(gcc_k, gcc) {
    //         if(gcc.linkId == key) has_match = true
    //       })
    //     })

    //     if(!has_match) lazyFetchDetails(value, key);
    //   });
    // })
  }

  function pinFileIcon(icon, val) {
    var storage     = firebase.storage();
    var ref_storage = storage.ref(['AppIcons', icon].join('/'));

    ref_storage.getDownloadURL().then(function(url) {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.onload = function(event) {
        addPinFile(val.id, val.name, val.date, val.size, xhr.response, val.wall, val.url, val.token_name);
      };
      xhr.open('GET', url);
      xhr.send();
    });
  }

  // function addPinFile(id, name, date, size, file, wall, url, token_name) {
  //   var reader = new FileReader();
  //   reader.readAsDataURL(file);
  //   reader.onloadend = function() {
  //       var metadata = {
  //         title: name,
  //         description: 'Created: ' + date  + "    " + "Size: " + (size/1000) + ' KB',
  //         img: reader.result,
  //         url: url,
  //         pinFormat: 'file',
  //         downloadUrl: url,
  //         wall: wall,
  //         token_name: token_name,
  //         date: new Date()
  //       };

  //       var pin_cont = [
  //         metadata.title,
  //         metadata.description,
  //         reader.result,
  //         metadata.downloadUrl,
  //         metadata.pinFormat,
  //         metadata.downloadUrl
  //       ];

  //       var pContainer = drawPost(pin_cont, wall, 'addlink', null, function(){});

  //       $.extend(metadata, {
  //         position: {
  //           x: pContainer.position.x,
  //           y: pContainer.position.y,
  //           z: pContainer.position.z,
  //         },
  //         rotation: {
  //           x: pContainer.rotation.x,
  //           y: pContainer.rotation.y,
  //           z: pContainer.rotation.z,
  //         }
  //       });

  //       pContainer.linkId = id;

  //       pContainer.pinFormat = metadata.pinFormat;
  //       pContainer.downloadUrl = metadata.downloadUrl;
  //       pContainer.token_name = metadata.token_name;

  //       addFileToRecord(metadata, cube_id, id);

  //       $.extend(metadata, {id: id});
  //       addLinkToSidebar(metadata);
        
  //     }
  // }

  function addPinFile(id, name, date, size, file, wall, url, token_name) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        var metadata = {
          title: name,
          description: 'Created: ' + date  + "    " + "Size: " + (size/1000) + ' KB',
          img: reader.result,
          url: url,
          pinFormat: 'file',
          downloadUrl: url,
          wall: wall,
          token_name: token_name,
          date: new Date()
        };

        var pin_cont = [
          metadata.title,
          metadata.description,
          reader.result,
          metadata.downloadUrl,
          metadata.pinFormat,
          metadata.downloadUrl
        ];

        var pContainer = drawPost(pin_cont, wall, 'addlink', null, function(){});

        $.extend(metadata, {
          position: {
            x: pContainer.position.x,
            y: pContainer.position.y,
            z: pContainer.position.z,
          },
          rotation: {
            x: pContainer.rotation.x,
            y: pContainer.rotation.y,
            z: pContainer.rotation.z,
          }
        });

        // pContainer.linkId = id;

        // pContainer.pinFormat = metadata.pinFormat;
        // pContainer.downloadUrl = metadata.downloadUrl;
        // pContainer.token_name = metadata.token_name;

        addFileToRecord(metadata, cube_id, id);

        // $.extend(metadata, {id: id});
        // addLinkToSidebar(metadata);
        
      }
  }

  function createGrids() {
    var material = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    var row_dif = (faceArea / rows * 2),
        col_dif = (faceArea / columns * 2);

    var h_geometry = new THREE.Geometry();
    h_geometry.vertices.push(
      new THREE.Vector3( -60, 0, 0 ),
      new THREE.Vector3( 60, 0, 0 )
    );

    var v_geometry = new THREE.Geometry();
    v_geometry.vertices.push(
      new THREE.Vector3( 0, faceArea, 0 ),
      new THREE.Vector3( 0, -faceArea, 0 )
    );

    var line_ctr = 0;

    for(var wall_ctr = 0; wall_ctr <= 5; wall_ctr++){
      for( line_ctr = faceArea; line_ctr >= -faceArea; line_ctr-=row_dif ) {
        var h_line = new THREE.Line( h_geometry, material );
        scene.add( h_line );
        gridPos(wall_ctr, h_line, line_ctr, false);
      }

      for( line_ctr = faceArea; line_ctr >= -faceArea; line_ctr-=col_dif ) {
        var v_line = new THREE.Line( v_geometry, material );
        scene.add( v_line );
        gridPos(wall_ctr, v_line, line_ctr, true);
      }
    }
  }

  function gridPos(wall, cline, val, vert) {
    switch(wall) {
      case 2:
        cline.position.y = faceArea;
        if(vert)  cline.position.x = val;
        else      cline.position.z = val;
        cline.rotation.x = -Math.PI / 2;
      break;
      case 3:
        cline.position.y = -faceArea;
        if(vert)  cline.position.x = val;
        else      cline.position.z = val;
        cline.rotation.x = -Math.PI / 2;
      break;
      case 1:
        cline.position.x = -faceArea;
        if(vert)  cline.position.z = val;
        else      cline.position.y = val;
        cline.rotation.y = Math.PI / 2;
      break;
      case 0:
        cline.position.x = faceArea;
        if(vert)  cline.position.z = val;
        else      cline.position.y = val;
        cline.rotation.y = (Math.PI) + (Math.PI / 2);
      break;
      case 5:
        cline.position.z = faceArea;
        if(vert)  cline.position.x = val;
        else      cline.position.y = val;
        cline.rotation.y = Math.PI;
      break;
      default:
        cline.position.z = -faceArea;
        if(vert)  cline.position.x = val;
        else      cline.position.y = val;
    }
  }

  function getRoomTextures(ImgUrl, tilesNum){
    var textures = [];
    for(var i=0; i<tilesNum; i++)
      textures[i] = new THREE.Texture();

    var imageObj = new Image();
    imageObj.onload = function(){
      var canvas, context;
      var tileWidth = imageObj.height;

      for(var i=0; i<textures.length; i++){
        canvas = document.createElement('canvas');
        context = canvas.getContext( '2d' );
        canvas.height = tileWidth;
        canvas.width = tileWidth;
        context.drawImage( imageObj, tileWidth * i, 0, tileWidth, tileWidth, 0, 0, tileWidth, tileWidth );
        textures[ i ].image = canvas;
        textures[ i ].needsUpdate = true;
      }
    };

    imageObj.src = ImgUrl;
    return textures;
  }


  function onDragStart(event){
    // console.log('dragstart');

    var link = event.object.parent.children,
        pContainer  = getObjectByContName(link, "metaholder");


    if(pContainer.name === "no-url") {
      dragControls.enabled = false;
      return 0;
    }

    if(!dragControls.enabled) {
      pContainer.initPos = {
        x: pContainer.position.x,
        y: pContainer.position.y,
        z: pContainer.position.z
      };

      pContainer.initRot = {
        x: pContainer.rotation.x,
        y: pContainer.rotation.y,
        z: pContainer.rotation.z
      };
    }
  }


  function onDragLink(event){
    var link = event.object.parent.children,
        pContainer  = getObjectByContName(link, "metaholder");
  
    if(pContainer.name === "no-url" || !event.object.allowDrag) {
      dragControls.enabled = false;
    }

    var minOffset      = (faceArea - (linkContainerW/2)) * -1,
        maxOffset      = minOffset * -1,
        minPolar       = faceArea - (linkContainerH/2),
        maxPolar       = minPolar * -1;

    var snapX = pContainer.position.x,
        snapY = pContainer.position.y,
        snapZ = pContainer.position.z;

    if(currentFace !== 2 && currentFace !== 3) {
      if(snapY > minPolar)        snapY = minPolar;
      else if(snapY < maxPolar)  snapY = maxPolar;
    } else {
      if(snapZ > minPolar)        snapZ = minPolar;
      else if(snapZ < maxPolar)  snapZ = maxPolar;
    }
  
    switch(currentFace) {
      case 4:
      case 5:
        if(snapX < minOffset)       snapX = minOffset;
        else if(snapX > maxOffset)  snapX = maxOffset;
        snapZ = faceArea - 0.9;
        pContainer.position.set(snapX, snapY, snapZ);
      break;

      case 1:
      case 0:
        if(snapZ < minOffset)       snapZ = minOffset;
        else if(snapZ > maxOffset)  snapZ = maxOffset;
        snapX = faceArea - 0.9;
        pContainer.position.set(snapX, snapY, snapZ);
      break;

      case 2:
      case 3:
        if(snapX < minOffset)       snapX = minOffset;
        else if(snapX > maxOffset)  snapX = maxOffset;
        snapY = faceArea - 0.9;
        pContainer.position.set(snapX, snapY, snapZ);
      break;
    }

    if (currentFace !== pContainer.faceIndex) rotateToWall(currentFace, event, false);
    else rotateToWall(pContainer.faceIndex, event, false);
  }

  function onDragEnd(event){
      // console.log('dragend');

      if(!$('#emoji-row').is(':visible'))
        setTimeout(function() { controls.enabled = true; }, 200);

      var link = event.object.parent.children,
          snapX, snapY, snapZ;

      overlaps = intersects.filter(function(overlapped) {
        return (isValidLink(overlapped.object.name));
      });

      // console.log("currentFace: " + currentFace);

      if (overlaps.length < 2) {
        snapX = link[0].initPos.x;
        snapY = link[0].initPos.y;
        snapZ = link[0].initPos.z;

        link[0].position.set(snapX, snapY, snapZ);
        rotateToWall(link[0].faceIndex, event, true);

        if(link[0].faceIndex !== currentFace) {
          repositionObjChild(event, link[0].faceIndex, true);
        } else {
          repositionObjChild(event, currentFace, false);
        }
      } else {
        var firstLink = overlaps[0].object,
            secndLink = overlaps[1].object,
            titleTextColor;

        secndLink.initPos = {
          x: secndLink.position.x,
          y: secndLink.position.y,
          z: secndLink.position.z
        };

        snapX = firstLink.initPos.x;
        snapY = firstLink.initPos.y;
        snapZ = firstLink.initPos.z;

        if(currentFace === firstLink.faceIndex) {
          secndLink.position.set(snapX, snapY, snapZ);
          repositionObjChild(overlaps[1], overlaps[1].object.faceIndex ,false);
          firstLink.position.set(secndLink.initPos.x, secndLink.initPos.y, secndLink.initPos.z);
          repositionObjChild(overlaps[0], overlaps[0].object.faceIndex, false);
        } else {
          
          if(secndLink.allowDrag) {
            secndLink.position.set(snapX, snapY, snapZ);
            rotateToWall(overlaps[0].object.faceIndex, overlaps[1], true);

            if(!secndLink.isImage) {
              titleTextColor = getObjectByContName(secndLink.parent.children, 'title').children[0];
              titleTextColor.material[0].color.set(getTitleColor(overlaps[0].object.faceIndex));
            }

            firstLink.position.set(secndLink.initPos.x, secndLink.initPos.y, secndLink.initPos.z);
            rotateToWall(overlaps[1].object.faceIndex, overlaps[0], true);
            
            if(!firstLink.isImage) {
              titleTextColor = getObjectByContName(firstLink.parent.children, 'title').children[0];
              titleTextColor.material[0].color.set(getTitleColor(overlaps[1].object.faceIndex));
            }

            firstLink.faceIndex = firstLink.faceIndex + secndLink.faceIndex;
            secndLink.faceIndex = firstLink.faceIndex - secndLink.faceIndex;
            firstLink.faceIndex = firstLink.faceIndex - secndLink.faceIndex;
          } else {
            firstLink.position.set(snapX, snapY, snapZ);
            rotateToWall(overlaps[0].object.faceIndex, overlaps[0], true);
            showErrorMessage('Unable to transfer pins on a not collaborated wall.');
            return 0;
          }
        }

        var fSideLink = $('#walls-holder').find('li#' + firstLink.linkId),
          pSideLink = fSideLink.next(),
          sSideLink = $('#walls-holder').find('li#' + secndLink.linkId);

        fSideLink.insertAfter(sSideLink);

        if(firstLink.faceIndex !== firstLink.secndLink){
          if(pSideLink)
            sSideLink.insertBefore(pSideLink);
          else {
            pSideLink = fSideLink.parent('ul');
            sSideLink.prepend(pSideLink);
          }
        }

        firstLink.initRot = {
          x: firstLink.rotation.x,
          y: firstLink.rotation.y,
          z: firstLink.rotation.z
        };

        secndLink.initRot = {
          x: secndLink.rotation.x,
          y: secndLink.rotation.y,
          z: secndLink.rotation.z
        };

        firstLink.initPos = {
          x: firstLink.position.x,
          y: firstLink.position.y,
          z: firstLink.position.z
        };

        secndLink.initPos = {
          x: secndLink.position.x,
          y: secndLink.position.y,
          z: secndLink.position.z
        };

        updateInterchangedLink(firstLink);
        updateInterchangedLink(secndLink);
      }
      dragControls.enabled = true;
    // }
  }


  function onHoverOn(event) {
    // console.log('hover on');
    var link        =  event.object.parent.children,
        pContainer  = getObjectByContName(link, "metaholder");

    // console.log(pContainer);

    if(pContainer.name === "no-url") {
      dragControls.enabled = false;
      return 0;
    }

    if(currentWall != undefined)
      unHovered(currentWall);

    onHovered(pContainer);

    currentWall = pContainer;
  }


  function onHoverOff(event) {
    // console.log('hover off');
    var link        =  event.object.parent.children,
        pContainer  = getObjectByContName(link, "metaholder");

    unHovered(pContainer);
  }


  function onWindowResize(){
    camera.aspect = 4/3;
    camera.updateProjectionMatrix();
    renderer.setSize($('#rooms').width(), window.innerHeight - 90);
    adjustLoader();
  }


  function onMouseMove(event){
    event.preventDefault();

    emojiRow.set(event.clientX, event.clientY);

    lookAtVector.x = 2 * ((event.clientX - domElement.left) / domElement.width) - 1;
    lookAtVector.y = (1 - 2 * ( (event.clientY - domElement.top) / domElement.height ));
  }


  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    render();
  }


  function onDblClick(event) {
    event.preventDefault();
    visitLink();
  }


  function onContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    if( !$('#emoji-row').is('visible') )
      dragControls.enabled = true;
  }


  function onMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    dragControls.enabled = false;

    if(touchtime === 0) {
      touchtime = new Date().getTime();
    } else {
      if(((new Date().getTime())-touchtime) < 220) {
        event.preventDefault();
        if(!$("#confirm_del_link").is(':visible') && !$("#emoji-row").is(':visible') && !$("#modalUpload").is(':visible'))
          visitLink(true);
        touchtime = 0;
      } else {
        if($("#modalUpload .knobcharts-area").is(':visible')) return 0;

        touchtime = new Date().getTime();
        var intersections = raycaster.intersectObjects(scene.children, true);

        if(intersections.length > 3 && !onloadEmoji) {
          var addEmojIcon = intersections.filter(function( obj ) {
                return obj.object.contname == "emojicon";
              })[0];

          var delCon = intersections.filter(function( obj ) {
                return obj.object.contname == "delicon";
              })[0];

          controls.enabled = false;
          controls.saveState();



          if(addEmojIcon && !$("#confirm_del_link").is(':visible')) {
            changeableEmoji = addEmojIcon;
            $("#emoji-row").css({
              top: emojiRow.y + 15,
              left: emojiRow.x - 10
            });

            $("#emoji-row").slideDown(200);
          } else if(delCon) {
            changeableEmoji = null;
            $("#emoji-row").slideUp(200);

            controls.enabled = false;
            controls.saveState();
            removePin(delCon.object.parent.children);
          }
        } else if((intersections.length > 1 && intersections.length < 4) && $("#emoji-row").is(':visible')) {
          var linkCont  = changeableEmoji.object.parent.children;
          var link_id   = getObjectByContName(linkCont, "metaholder").linkId;

          var clickedId = intersections.filter(function( obj ) {
                return obj.object.contname == "metaholder";
              })[0].object.linkId;

          if(link_id !== clickedId) {
            $("#emoji-row").slideUp(200);
            dragControls.enabled = true;
            controls.enabled = true;
            controls.reset();
          }

        } else if(intersections.length == 1) {
          if( $("#emoji-row").is(':visible') )
            setTimeout(function(){
              $("#emoji-row").slideUp(200);
              dragControls.enabled = true;
              controls.enabled = true;
              controls.reset();
            }, 200);
        }
      }
      
    }
  }


  function visitLink(dbl) {
    raycaster.setFromCamera(lookAtVector, camera);
    var intersections = raycaster.intersectObjects(scene.children, true);
    if(intersections.length>1){
      var isBox = intersections[0].object.geometry.type !== "BoxGeometry",
          isLine  = intersections[0].object.type !== "Line";
      if(isBox && isLine){
        // console.log(intersections);
        var pCont;
          pCont = intersections[intersections.length-2].object;

        if(txtLink.is(':visible') || $('#add-collab-holder').is(':visible') || $('.dropdown-menu.notifications').is(':visible'))
          return false;

        if(pCont.name === "no-url") {
          if(!$('.panel[data-wall="' + pCont.faceIndex + '"] .panel-body').is(':visible'))
            $('#walls-holder .wall-link[data-wall="' + pCont.faceIndex + '"]')
            .trigger('click');

          $(".info").slideUp(100);
          $('#add-collab-holder').slideUp(100);
          $('#text-holder').slideDown(100);
          txtLink.attr('add-to-wall', pCont.faceIndex);
          txtLink.focus();
        } else {
          if(dbl)
            window.open(pCont.name, '_blank');
        }
      }
    } else {
      emptyWallToDropdown()
    }
  }

  function emptyWallToDropdown() {
    var panel_heading = $('a.wall-link[data-wall="' + currentFace + '"]');
    var panel = panel_heading.closest('.panel')
    var panel_collapse = panel.find('.panel-collapse')
    
    panel_heading.trigger('click');
    panel_collapse.find('.add-new-link').trigger('click');
  }


  function wallRotation() {
    var azimuthAngle  = controls.getAzimuthalAngle(),
      polarAngle    = controls.getPolarAngle(),
      difAngle      = 0.1308996938995748;

    if ((prevFace == 4 || prevFace == undefined) || ((prevFace == 2 || prevFace == 3) && rotate_room == 4)){
      if(HazimuthAngle != 0)
        controls.rotateLeft(HazimuthAngle-0);
    } else if(prevFace === 0 || ((prevFace == 2 || prevFace == 3) && rotate_room == 0)) {
      if(HazimuthAngle != (Math.PI/2) * -1)
        controls.rotateLeft(HazimuthAngle - ((Math.PI/2) * -1));
    } else if(prevFace == 5 || ((prevFace == 2 || prevFace == 3) && rotate_room == 5)) {
      if(HazimuthAngle != (Math.PI) * -1)
        controls.rotateLeft(HazimuthAngle - ((Math.PI) * -1));
    } else if(prevFace == 1 || ((prevFace == 2 || prevFace == 3) && rotate_room == 1)) {
      if(HazimuthAngle != (Math.PI/2))
        controls.rotateLeft(HazimuthAngle - Math.PI/2);
    }
    
    if(rotate_room !== 2 && rotate_room !==3 && polarAngle != Math.PI/2) {
      if(polarAngle >= (Math.PI/2)+0.010) {
        controls.rotateUp(polarAngle - (Math.PI/2));
      } else if(polarAngle <= ((Math.PI/2))-0.010){
        controls.rotateUp(((Math.PI/2) - polarAngle) * -1);
      }
    }

    if(rotate_room === 3 || rotate_room === 2) {
      controls.rotateLeft(HazimuthAngle + 0);
    }

    switch(rotate_room) {
      case 3: // BLUE
        if(prevFace == 2) controls.rotateUp(Math.PI);
        else controls.rotateUp(Math.PI/2);
      break;
      case 2: // CYAN
          controls.rotateUp(-Math.PI);

      case 4: // YELLOW
        if(prevFace != 4 && prevFace !== 2)
          if(prevFace == 1)
            controls.rotateLeft(Math.PI/2);
          else if(prevFace === 0)
            controls.rotateLeft((Math.PI/2) * -1);
          else if(prevFace == 5)
            controls.rotateLeft(Math.PI);
      break;

      case 1: //RED
        if(prevFace != 1 && prevFace !== 2)
          if(prevFace == undefined || prevFace == 4 || prevFace == 2) {
            controls.rotateLeft((Math.PI/2) * -1);
          } else if(prevFace === 0) {
            controls.rotateLeft(Math.PI);
          } else if(prevFace == 5) {
            controls.rotateLeft(Math.PI/2);
          }
      break;

      case 0: //MAGENTA
        if(prevFace !== 0 && prevFace !== 2)
          if(prevFace == 4 || prevFace == 2 || prevFace == undefined)
            controls.rotateLeft(Math.PI/2);
          else if(prevFace == 5)
            controls.rotateLeft((Math.PI/2) * -1);
          else if(prevFace == 1)
            controls.rotateLeft(Math.PI);
      break;

      case 5: // GREEN
        if(prevFace !== 5 && prevFace != 2)
          if(prevFace == undefined || prevFace == 4 || prevFace == 2)
            controls.rotateLeft(Math.PI);
          else if(prevFace == 0)
            controls.rotateLeft(Math.PI/2);
          else if(prevFace == 1)
            controls.rotateLeft((Math.PI/2) * -1);
      break;
    }

    controls.maxAzimuthAngle = Infinity;
    prevFace = rotate_room;
  }


  function stopRotateWall(stopAt) {
    if(controls.getAzimuthalAngle() < stopAt) {
      controls.autoRotate = false;
      rotate_room = undefined;
    }
    return true;
  }


  function render(){
    HazimuthAngle = controls.getAzimuthalAngle();
    raycaster.setFromCamera(lookAtVector, camera);
    intersects = raycaster.intersectObjects(scene.children, true);

    currentFace = intersects[intersects.length-1].face.materialIndex;
    renderer.render(scene, camera);
  }
 

  function onHovered(container) {
    container.material.color.set( 0xDFDFDF );
  }


  function unHovered(container) {
    container.material.color.set( 0xffffff );
  }


  function hover(container){
    if(intersected != container.children[0]){
      if(intersected && (container.children[0].uuid !== intersected.uuid) ){
        onFocus(0x000000);
        intersected = null;
      }
      intersected = container.children[0];
      onFocus(0x1C2833);
    }
  }


  function onFocus(color) {
    try {
      intersected.material.color.set( color );
    }
    catch(err){
    }
  }
});


function lazyFetchDetails(linkDetail, key){

  switch(linkDetail.wall) {
    case 0: rightWall++;  break;
    case 1: leftWall++;   break;
    case 2: ceiling++;    break;
    case 3: floor++;      break;
    case 4: firstWall++;  break;
    case 5: backWall++;   break;
  }

  $.extend(linkDetail, {id: key});
  if(!linkDetail.title) linkDetail.title = urlToTitle(linkDetail.url);
  addLinkToSidebar(linkDetail);

  drawPost(
    [
      linkDetail.title,
      linkDetail.description,
      linkDetail.img,
      linkDetail.url,
      linkDetail.pinFormat,
      linkDetail.downloadUrl,
      linkDetail.position,
      linkDetail.rotation,
      linkDetail.token_name,
      key
    ], linkDetail.wall, linkDetail.type ? linkDetail.type : 'addlink', key, function(){}
  );
}


function drawEmptyLinks(wall) {
  var container = drawPost(
    [
      'Add New Link',
      "Double click here to add a new link to this wall.",
      addImage,
      'no-url'
    ],
    wall, '', null, function(){}
  );

  var squareLine = container.geometry.clone();
  var group = container.parent.children;
  squareLine.verticesNeedUpdate = true;

  // console.log(group);

  squareLine.vertices.push( new THREE.Vector3(
    squareLine.vertices[0].x,
    squareLine.vertices[0].y,
    squareLine.vertices[0].z
  ));

  squareLine.computeLineDistances();

  var vertex4 = squareLine.vertices[2];
  squareLine.vertices[2] = squareLine.vertices[3];
  squareLine.vertices[3] = vertex4;

  var line = new THREE.Line(squareLine, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.4, gapSize: 0.4, linewidth: 1}));
  line.position.set(container.position.x, container.position.y, container.position.z);
  line.rotation.set(container.rotation.x, container.rotation.y, container.rotation.z);
  group.push(line);

  emptylinks++;
}


function addLinkToSidebar(link) {
  var add_btn = $('#walls-holder div.panel[data-wall="' + link.wall + '"]')
  .find('ul.wraplist li:last');

  var linkDel = '', linkclass = '';

  // if($.inArray(parseInt(link.wall), ownerStat.walls) >= 0) {
    linkDel += '<i class="fa fa-trash remove-link text-danger" data-link="' + link.id + '"></i>'
    linkclass = 'owned-cube';
  // }

  $('<li id="' + link.id + '">' +
    '<a href="' + link.url + '" target="_blank" class="' + linkclass + '">' +
      link.title +
    '</a>' +
    linkDel +
  '</li>').insertBefore(add_btn);


  $('li#' + link.id).find('.remove-link').click(function() {
    var id = $(this).data('link');

    var del_link = links.filter(function(obj) {
      return obj.linkId == id;
    });

    removePin(del_link[0].parent.children);
  });
}

function rotateToWall(wall, event, revert) {
  var link = event.object.parent.children,
      pContainer  = getObjectByContName(link, "metaholder");
  var snapX, snapY, snapZ, stickToWall, rotation =0;
  if(revert) stickToWall = -faceArea + -0.5;
  else       stickToWall = -faceArea + 0.1;

  switch(wall) {
    case 1:
      snapX = stickToWall;
      snapY = pContainer.position.y;
      snapZ = pContainer.position.z;
      rotation = Math.PI / 2;
    break;

    case 4:
      snapX = pContainer.position.x;
      snapY = pContainer.position.y;
      snapZ = stickToWall;
      rotation = 0;
    break;

    case 0:
      snapX = stickToWall * -1;
      snapY = pContainer.position.y;
      snapZ = pContainer.position.z;
      rotation = (Math.PI) + (Math.PI / 2);
    break;

    case 5:
      snapX = pContainer.position.x;
      snapY = pContainer.position.y;
      snapZ = stickToWall * -1;
      rotation = Math.PI;
    break;

    case 2:
      snapX = pContainer.position.x;
      snapY = stickToWall * -1;
      snapZ = pContainer.position.z;
      rotation = Math.PI / 2;
      pContainer.rotation.y = 0;
    break;

    case 3:
      snapX = pContainer.position.x;
      snapY = stickToWall;
      snapZ = pContainer.position.z;
      rotation = -Math.PI / 2;
      pContainer.rotation.y = 0;
    break;
  }

  if( wall === 2 || wall === 3 ) pContainer.rotation.x = rotation;
  else {
    pContainer.rotation.x = 0;
    pContainer.rotation.y = rotation;
  }

  pContainer.position.set(snapX, snapY, snapZ);
  repositionObjChild(event, wall, true);
}


function repositionObjChild(event, wall, allowRotate){
  var linkChild = event.object.parent.children;

  var  width = linkContainerW, height = linkContainerH/4;

  var metaholder  = getObjectByContName(linkChild, 'metaholder'),
      titleChild  = getObjectByContName(linkChild, 'title'),
      descChild   = getObjectByContName(linkChild, 'description'),
      imgIcon     = getObjectByContName(linkChild, 'icon'),
      emojiBg     = getObjectByContName(linkChild, 'emojibg'),
      emoji       = getObjectByContName(linkChild, 'emojicon'),
      delIcon     = getObjectByContName(linkChild, 'delicon'),
      repoImgIcon = null;


  var snapX = metaholder.position.x,
      snapY = metaholder.position.y,
      snapZ = metaholder.position.z;

  var titleMeta = textPosition(wall, snapX, snapY, snapZ, 1);
      descrMeta   = textPosition(wall, snapX, snapY, snapZ, 0);
      iconMeta    = iconPosition(wall, snapX, snapY, snapZ, width, height);
      emojiBgPos  = emojiBgPosition(wall, iconMeta.x, iconMeta.y, iconMeta.z);
      imojiCurr   = iconPosition(wall, snapX, snapY, snapZ, 4.5, 4.5);
      emojiPos    = emojiIconPosition(wall, imojiCurr.x, imojiCurr.y, imojiCurr.z);
      delIconPos  = delIconPosition(wall, imojiCurr.x, imojiCurr.y, imojiCurr.z);

  if(titleChild)
    titleChild.children[0].position.set(
      titleMeta.x,
      titleMeta.y,
      titleMeta.z
    );

  if(descChild)
    descChild.children[0].position.set(
      descrMeta.x,
      descrMeta.y,
      descrMeta.z
    );

  if(metaholder.isImage)
    repoImgIcon = imgOnly(wall, iconMeta.x, iconMeta.y, iconMeta.z)
  else
    repoImgIcon = imgWithMetas(wall, iconMeta.x, iconMeta.y, iconMeta.z)


  if(imgIcon)
    imgIcon.position.set(
      repoImgIcon.x,
      repoImgIcon.y,
      repoImgIcon.z
    );

  emojiBg.position.set(
    emojiBgPos.x,
    emojiBgPos.y,
    emojiBgPos.z
  );

  if( emoji )
    emoji.position.set(
      emojiPos.x,
      emojiPos.y,
      emojiPos.z
    );

  if( delIcon )
    delIcon.position.set(
      delIconPos.x,
      delIconPos.y,
      delIconPos.z
    );


  if (allowRotate) {
    if( wall === 2 || wall === 3 ) {
      if(titleChild) titleChild.children[0].rotation.x  = titleMeta.roX;
      if(descChild) descChild.children[0].rotation.x    = descrMeta.roX;
      if(imgIcon) imgIcon.rotation.x                    = iconMeta.roX;
      emojiBg.rotation.x                                = iconMeta.roX;
      if( delIcon ) delIcon.rotation.x                  = iconMeta.roX;

      if( emoji )
        emoji.rotation.x                                = iconMeta.roX;

      if(titleChild) titleChild.children[0].rotation.y  = 0;
      if(descChild) descChild.children[0].rotation.y    = 0;
      if(imgIcon) imgIcon.rotation.y                    = 0;
      emojiBg.rotation.y                                = 0;
      if( delIcon ) delIcon.rotation.y                  = 0;

      if( emoji )
        emoji.rotation.y                                = 0;

    }
    else {
      if(imgIcon && metaholder.rotation.x != imgIcon.rotation.x) {
        if(titleChild) titleChild.children[0].rotation.x  = 0;
        if(descChild) descChild.children[0].rotation.x    = 0;
        if(imgIcon) imgIcon.rotation.x                    = 0;
        emojiBg.rotation.x                                = 0;
        if( delIcon ) delIcon.rotation.x                  = 0;

        if( emoji )
          emoji.rotation.x                                = 0;
      }

      if(titleChild) titleChild.children[0].rotation.y  = titleMeta.roY;
      if(descChild) descChild.children[0].rotation.y    = descrMeta.roY;
      if(imgIcon) imgIcon.rotation.y                    = iconMeta.roY;
      emojiBg.rotation.y                                = iconMeta.roY;
      if(delIcon) delIcon.rotation.y                    = iconMeta.roY;

      if( emoji )
        emoji.rotation.y                                = iconMeta.roY;
    }
  }
}

function getObjectByContName(objs,name) {
  return objs.filter(function(obj){
    return (obj.contname === name);
  })[0];
}

function updateInterchangedLink(obj) {
  setTimeout(function() {
    var metaData = {
      position: {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
      },
      rotation: {
        x: obj.rotation.x,
        y: obj.rotation.y,
        z: obj.rotation.z,
      },
      wall: obj.faceIndex,
      date: new Date()
    };

    updateLinkToRecord(metaData, cube_id, obj.linkId);
  }, Math.floor( Math.random() * 10 ));
}

function removePin(cont) {
  var holder = getObjectByContName(cont, "metaholder"),
      pin_id = undefined;

  $( "#confirm_del_link" ).dialog({
    modal: true,
    open: function(event, ui) {  controls.reset(); },
    close: function() {
      dragControls.enabled = true;
      controls.enabled = true;
      controls.reset();
    },
    buttons: {
      'Yes': function() {
        var reflink = firebase.database().ref(['Links', cube_id, holder.linkId].join('/'));
        

        $.each(links, function(pin, pval) {
          if(holder.linkId === pval.linkId) pin_id = pin;
        });

        if(holder.pinFormat === 'file') {
          var refstor = firebase.storage().ref().child(
                ['PinFiles', cube_id, holder.linkId, holder.token_name].join('/')
              );
          
          refstor.delete();
        }

        $('#walls-holder').find('li#' + holder.linkId).remove();

        scene.remove(holder);
        scene.remove(holder.parent);
        links.splice(pin_id, 1);

        updateSucceedingLinks(holder, true);

        if(!links.length) {
          for(var ctr=0; ctr<=5; ctr++) {
            drawEmptyLinks(ctr);
          }
        }
        
        reflink.remove();
        $(this).dialog('close');
      },
      'No': function() {
        $(this).dialog('close');
      }
    }
  });
}

function updateSucceedingLinks(pin, allow_update) {
  var pos_x = pin.position.x,
      pos_y = pin.position.y,
      pos_z = pin.position.z;

  var succeeding_links = new Array();

  var wall_links = links.filter(function(obj) {
    return (obj.faceIndex === pin.faceIndex && obj.linkId != pin.linkId);
  });

  switch(pin.faceIndex) {
    case 4:
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.x > pin.position.x && obj.position.y == pin.position.y) ||
                (obj.position.y < pin.position.y && obj.faceIndex.y === pin.faceIndex.y));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.x < b.position.x && a.position.y == b.position.y) || (a.position.y > b.position.y))
          return  -1;
        if((a.position.x > b.position.x && a.position.y == b.position.y) || (a.position.y < b.position.y))
          return 1;
        return 0;
      });

      firstWall--;
    break;

    case 5: 
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.x < pin.position.x && obj.position.y == pin.position.y) ||
                (obj.position.y < pin.position.y && obj.faceIndex.y === pin.faceIndex.y));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.x > b.position.x && a.position.y == b.position.y) || (a.position.y > b.position.y))
          return  -1;
        if((a.position.x < b.position.x && a.position.y == b.position.y) || (a.position.y < b.position.y))
          return 1;
        return 0;
      });
      backWall--;
    break;

    case 0:
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.z > pin.position.z && obj.position.y == pin.position.y) ||
                (obj.position.y < pin.position.y && obj.faceIndex.y === pin.faceIndex.y));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.z < b.position.z && a.position.y == b.position.y) || (a.position.y > b.position.y))
          return  -1;
        if((a.position.z > b.position.z && a.position.y == b.position.y) || (a.position.y < b.position.y))
          return 1;
        return 0;
      });
      rightWall--;
    break;

    case 1: 
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.z < pin.position.z && obj.position.y == pin.position.y) ||
                (obj.position.y < pin.position.y && obj.faceIndex.y === pin.faceIndex.y));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.z > b.position.z && a.position.y == b.position.y) || (a.position.y > b.position.y))
          return  -1;
        if((a.position.z < b.position.z && a.position.y == b.position.y) || (a.position.y < b.position.y))
          return 1;
        return 0;
      });
      leftWall--;
    break;

    case 2:
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.x > pin.position.x && obj.position.z == pin.position.z) ||
                (obj.position.z < pin.position.z && obj.faceIndex.z === pin.faceIndex.z));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.x < b.position.x && a.position.z == b.position.z) || (a.position.z > b.position.z))
          return  -1;
        if((a.position.x > b.position.x && a.position.z == b.position.z) || (a.position.z < b.position.z))
          return 1;
        return 0;
      });

      ceiling--;
    break;

    case 3:
      succeeding_links = wall_links.filter(function(obj) {
        return ((obj.position.x > pin.position.x && obj.position.z == pin.position.z) ||
                (obj.position.z > pin.position.z && obj.faceIndex.z === pin.faceIndex.z));
      });

      succeeding_links.sort(function(a,b) {
        if((a.position.x < b.position.x && a.position.z == b.position.z) || (a.position.z < b.position.z))
          return  -1;
        if((a.position.x > b.position.x && a.position.z == b.position.z) || (a.position.z > b.position.z))
          return 1;
        return 0;
      });
      floor--; 
    break;
  }

  if(allow_update)
    $.each(succeeding_links, function(idx, pin_obj) {
      // console.log(pin_obj)
      // pin_obj.position.set(pos_x, pos_y, pos_z);

      // pos_x = pin_obj.initPos.x;
      // pos_y = pin_obj.initPos.y;
      // pos_z = pin_obj.initPos.z;

      // pin_obj.initPos.x = pin_obj.position.x;
      // pin_obj.initPos.y = pin_obj.position.y;
      // pin_obj.initPos.z = pin_obj.position.z;

      // updateInterchangedLink(pin_obj.clone());

      // rotateToWall(pin_obj.faceIndex, {object: pin_obj}, true);

      clone_obj = pin_obj.clone();
      clone_obj.faceIndex = pin_obj.faceIndex
      clone_obj.linkId = pin_obj.linkId
      clone_obj.position.set(pos_x, pos_y, pos_z);
      updateInterchangedLink(clone_obj);

      pos_x = pin_obj.initPos.x;
      pos_y = pin_obj.initPos.y;
      pos_z = pin_obj.initPos.z;
    });
}


function unequalPos(prev, curr) {
  var prev_pos = prev.position,
      curr_pos = curr.position
  return prev_pos.x != curr_pos.x || prev_pos.y != curr_pos.y || prev_pos.z != curr_pos.z
}


function unequalRot(prev, curr) {
  var prev_rot = prev.rotation,
      curr_rot = curr.rotation;
  return prev_rot.x != curr_rot.x || prev_rot.y != curr_rot.y || prev_rot.z != curr_rot.z
}


function reorderWallLinks(wall) {
  var lks = [];

  glks = scene.children.filter(function(glk) {
    glk_holder = glk.children.filter(function(glkh){
      return glkh.contname == "metaholder"
    })[0];
    return glk.type == "Group" && glk_holder.faceIndex == wall
  })

  $.each(glks, function(idx, val) {
    lks.push(
      val.children.filter(function(glkh){
        return glkh.contname == "metaholder"
      })[0]
    )
  })

  // console.log(lks)
  
  switch(wall){
    case 0:
      lks.sort(function(a, b) {
        return a.position.z-b.position.z;
      }).sort(function(a, b) {
        return b.position.y-a.position.y;
      });
      break;
    case 1:
      lks.sort(function(a, b) {
        return b.position.z-a.position.z;
      }).sort(function(a, b) {
        return a.position.y-b.position.y;
      });
      break;
    case 2: 
      lks.sort(function(a, b) {
        return a.position.x-b.position.x;
      }).sort(function(a, b) {
        return b.position.z-a.position.z;
      });
      break;
    case 3: 
      lks.sort(function(a, b) {
        return a.position.x-b.position.x;
      }).sort(function(a, b) {
        return a.position.z-b.position.z;
      });
      break;
    case 4:
      lks.sort(function(a, b) {
        return a.position.x-b.position.x;
      }).sort(function(a, b) {
        return b.position.y-a.position.y;
      });
      break;
    case 5:
      lks.sort(function(a, b) {
        return b.position.x-a.position.x;
      }).sort(function(a, b) {
        return b.position.y-a.position.y;
      });
      break;
  }

  var wall_holder = $('#walls-holder'),
      ul_holder = wall_holder.find('div.panel[data-wall="' + wall + '"] .panel-collapse .panel-body ul'),
      prevlk = undefined;

  $.each(lks, function(key, lk){
    lk_id = lk.linkId
    var link2trans = ul_holder.find('li#' + lk_id)
    if(key == 0) {
      ul_holder.prepend(link2trans)
    } else {
      link2trans.insertAfter(prevlk)
    }

    prevlk = link2trans;
  })
}


function fetchLinkDetails(recordedLink, linkWall, updateLink, postKey) {
  try {
    var url = "", cubeFace = -1;
    if(recordedLink === "" || recordedLink == null){
      url = txtLink.val();

      if(linkWall != null || linkWall != undefined) cubeFace = linkWall;
      else cubeFace = currentFace;

    } else {
      url = recordedLink;
      cubeFace = linkWall;
    }

    img = "";
    var visit_url = "/fetch_html?url=" + url;

    if(!isDropboxFile(url))
      visit_url = "/fetch_html?url=" + url + " meta, title, img";

    $('#meta-container').load(visit_url, function(response, status, xhr){
      if(status == "error"){
        setTimeout(function() {
          alert('Woops, there was an error making the request.');
          $('#text-holder').slideUp(100);
          txtLink.removeAttr('add-to-wall');
          txtLink.removeAttr('disabled');
        }, 1700);
      }
      else {
        var title = "", description = "";
        if(!isImagePost(url)) {
          title       = $.trim($(this).find('title').text());
          description = $.trim($(this).find('meta[name=description]').attr('content')) || '';
          img = $(this).find('meta[name="msapplication-TileImage"]').attr('content') ||
                $(this).find('meta[itemprop="image"]').attr('content') || '';

          var hasNewLine = description.indexOf("\n");
          if(hasNewLine>0){
            description = description.slice(0, hasNewLine);
          }

          if(img === '' || !isImagePost(img)){
            if($(this).find('meta[property="og:image"]').length>0){
              $(this).find('meta[property="og:image"]').each(function(){
                if(isImagePost($(this).attr('content'))){
                  img = $(this).attr('content');
                  return false;
                }
              });
            } else {
              $(this).children('img').each(function() {
                var imgSrc = $(this).attr('src');
                if(imgSrc){
                  img = imgSrc;
                  return false;
                }
              });
            }
          } else if($('.ProfileAvatar-image').is(':visible')) {
            img = $('.ProfileAvatar-image').attr('src');
          }

          if(img.match(/(\/\/.{1})/) && img.indexOf(":") == -1){
            img = 'https:' + img;
          }
          else if(!img.match(/((http)|(https):\/\/)/) && img.indexOf("http://www" == -1)){
            try {
              var uri = new URL(url);
              img = uri.origin + img;
            } catch(e) {
              img = url + img;
            }
          }

          if(description === '') description = "Unable to display the website's description. No description found or website's description was not set.";
        } else {
          img = $(this).find('img').attr('src');
        }
        
        if(!isImagePost(img)) img = defaultImage;

        url = $(this).find('img[class="mod-url"]').attr('data-url');

        var metaData = {
          title:        title,
          description: description,
          img:          img,
          url:          url,
          wall:         linkWall !== null ? linkWall : currentFace,
          date:         new Date($.now())
        };

        var max_links = (columns * rows);

        if(!updateLink && postKey == null) {
          if(firstWall > max_links && cubeFace === 4)
            alert('Yellow wall is already full.');
          else if(leftWall > max_links && cubeFace === 1)
            alert('Red wall is already full.');
          else if(rightWall > max_links && cubeFace === 0)
            alert('Magenta wall is already full.');
          else if(backWall > max_links && cubeFace === 5)
            alert('Green is already full.');
          else if(ceiling > max_links && cubeFace === 2)
            alert('Cyan is already full.');
          else if(floor > max_links && cubeFace === 2)
            alert('Blue is already full.');
          else {

            if( cubeFace === 4 )
              wallPosts = firstWall;
            else if( cubeFace === 1 )
              wallPosts = leftWall;
            else if( cubeFace === 0 )
              wallPosts = rightWall;
            else if( cubeFace === 5 )
              wallPosts = backWall;
            else if( cubeFace === 2 )
              wallPosts = ceiling;
            else if( cubeFace === 3 )
              wallPosts = floor;

            var pContainer = drawPost([title, description, img, url, 'link', ''], cubeFace, 'addlink',null,function(){});
            // drawPost(["Title", "description", "img", url], wallPosts%2);
            
            if((recordedLink === "" || recordedLink === null) && firebase.auth().currentUser) {
              $.extend(metaData, {
                pinFormat: 'link',
                downloadUrl: '',
                token_name: '',
                position: {
                  x: pContainer.position.x,
                  y: pContainer.position.y,
                  z: pContainer.position.z,
                },
                rotation: {
                  x: pContainer.rotation.x,
                  y: pContainer.rotation.y,
                  z: pContainer.rotation.z,
                }
              });

              // pContainer.linkId = addLinkToRecord(metaData, cube_id);
              // 

              if(pContainer.isImage)  metaData.title = urlToTitle(pContainer.name);
              addLinkToRecord(metaData, cube_id)
              
              // $.extend(metaData, {id: pContainer.linkId});

              // if(pContainer.isImage)  metaData.title = urlToTitle(pContainer.name);
              
              // addLinkToSidebar(metaData);
              // if(emptylinks > 0) clearEmptyLinks();
            }
          }
          if($('.info').is(':visible')) $('.info').slideUp(50);
          txtLink.val('');
          $(this).html('');
          $('#text-holder').slideUp(100);
          txtLink.removeAttr('add-to-wall');
          txtLink.removeAttr('disabled');
        } else {
          delete metaData.date;
          updateLinkToRecord(metaData, cube_id, postKey);

          $("#meta-container").html('');
        }
      }
    });
  } catch(e){}
}

function clearEmptyLinks() {
  $.each(links, function(idx, val) {
    if(val.name === 'no-url'){
      scene.remove(val.parent);
    }
  });
  links.splice(0,links.length);
  emptylinks = 0;
}


function drawPost(txts, wall, category, index){
  var xOffset = ((faceArea - (linkContainerW/2) - 0.14)) * -1,
      isNewLink = txts.length < 7,
      fColor = getTitleColor(wall),
      yOffset, zOffset, rotation=0;
  
  // var allowDrag = $.inArray(parseInt(wall), ownerStat.walls) >= 0;
  var allowDrag = true;

  if(isNewLink) {
    var azimuthModulator = countWall(wall)%columns ?
                            countWall(wall)%columns : columns;

    yOffset = (faceArea - (linkContainerH/2) - 0.45);
    zOffset = -faceArea + -0.5;
    rotation = 0;

    xOffset -= ((xOffset / 2) * (azimuthModulator -1) * gridSpace(columns));
    yOffset -= ((yOffset / 2) * (Math.floor((countWall(wall)-1)/columns)) * gridSpace(rows));

    switch(wall) {
      case 2:
        rotation = Math.PI / 2;
        zOffset = yOffset;
        yOffset = faceArea + 0.5;
        if(txts[3] !== 'no-url' && index !== null) ceiling++;
      break;
      case 3:
        rotation = -Math.PI / 2;
        zOffset = -yOffset;
        yOffset = -faceArea + -0.5;
        if(txts[3] !== 'no-url' && index !== null) floor++;
      break;
      case 1:
        rotation = Math.PI / 2;
        zOffset = xOffset * - 1;
        xOffset = -faceArea + -0.5;
        if(txts[3] !== 'no-url' && index !== null) leftWall++;
      break;
      case 0:
        zOffset = xOffset;
        xOffset = faceArea + 0.5;
        rotation = (Math.PI) + (Math.PI / 2);
        if(txts[3] !== 'no-url' && index !== null) rightWall++;
      break;
      case 5:
        rotation = Math.PI;
        zOffset = faceArea + 0.5;
        xOffset *= -1;
        if(txts[3] !== 'no-url' && index !== null) backWall++;
      break;
      default:
        if(txts[3] !== 'no-url' && index !== null) firstWall++;
    }
  } else {
    xOffset = txts[6].x;
    yOffset = txts[6].y;
    zOffset = txts[6].z;

    xRotation = txts[7].x;
    yRotation = txts[7].y;
    zRotation = txts[7].z;
  }

  var group = new THREE.Group();
  
  var isImage = isImagePost(txts[3]) && txts[4] !== 'file';

  var postGeo = new THREE.PlaneGeometry(linkContainerW, linkContainerH);
  var postMaterial = new THREE.MeshBasicMaterial({color: 0xffffff } );
  var postContainer = new THREE.Mesh(postGeo, postMaterial);

  postContainer.name = txts[3];
  postContainer.pinFormat = txts[4];
  postContainer.downloadUrl = txts[5];
  postContainer.contname = 'metaholder';
  postContainer.position.set(xOffset, yOffset, zOffset);
  postContainer.allowDrag = allowDrag;
  postContainer.initPos = {
    x: xOffset,
    y: yOffset,
    z: zOffset
  };
  postContainer.faceIndex = wall;
  postContainer.isImage = isImage;
  group.add(postContainer);

  group.add(makeEmoji(wall, xOffset, yOffset, zOffset));

  if(category) {
    getEmoji(category, wall, xOffset, yOffset, zOffset, group);

    if(allowDrag) {
      addDelete(wall, xOffset, yOffset, zOffset, group);
    }
  }

  if( !isImage ){
    var posX = xOffset - 1.5;
    
    var imageLoader = new THREE.TextureLoader(),
        imageObj;
    
    if(isBase64(txts[2])){
      imageLoader.load(
        txts[2],
        function(texture){
          group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall));
        },
        function(xhr){},
        function(xhr){
          alert("Error on displaying image.");
        }
      );
    } else {
      if(!isValidLink(txts[2])) {
        if(txts[2].toLowerCase().indexOf('http') === -1){
          txts[2] = ['http://', txts[2].slice(protoSep, txts[2].length)].join('');
        }
        if(txts[2].toLowerCase().indexOf('www') === -1){
          var protoSep = txts[2].indexOf('://') + 3;
          txts[2] = [txts[2].slice(0, protoSep), 'www.', txts[2].slice(protoSep, txts[2].length)].join('');
        }
      }

      $.ajax({
        url: "/verify_image_url?url=" + txts[2]
      }).success(function(data) {
        if(data.response === "Not Found") {
          imageLoader.load(
            defaultImage,
            function(texture){
              group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
            },
            function(xhr){},
            function(xhr){
              alert("Error on displaying image.");
            }
          );
        } else {
          $.ajax({
            url: "/fetch_html?url=" + String(txts[2]),
          }).success(function(data){
            imageLoader.load(
              $(data).attr('src'),
              function(texture){
                group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
              },
              function(xhr){},
              function(xhr){
                imageLoader.load(
                  defaultImage,
                  function(texture){
                    group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
                  }
                );
              }
            );
          }).fail(function(){
            imageLoader.load(
              txts[2].indexOf("addlink.png") ? addImage : defaultImage,
              function(texture){
                group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
              },
              function(xhr){},
              function(xhr){
                alert("Error on displaying image.");
              }
            );
          });
        }
      }).error(function() {
        imageLoader.load(
          defaultImage,
          function(texture){
            group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
          },
          function(xhr){},
          function(xhr){
            // console.log('asdf');
            alert("Error on displaying image.");
          }
        );
      });
    }

    var loader = new THREE.FontLoader();
    loader.load('/assets/threejs/fonts/helvetiker_regular.typeface.json', function(font){
      // group.add(createText(font, 0x000000, strToNewLine(txts[0], 25, 1, true), xOffset, yOffset, zOffset, true, wall));
      // group.add(createText(font, 0x000000, strToNewLine(txts[1], 25, 3, false), xOffset, yOffset, zOffset, false, wall));

      group.add(createText(font, 0x000000, strToNewLine(txts[0], 17, 1, true), xOffset, yOffset, zOffset, true, wall));
      group.add(createText(font, 0x000000, strToNewLine(txts[1], 16, 2, false), xOffset, yOffset, zOffset, false, wall));
    });
  } else {
    var linkImageLoader = new THREE.TextureLoader();
      linkImageLoader.load(
      txts[2],
      function(texture){
        group.add(makeImg(texture, xOffset, yOffset, zOffset, txts[0], isImage, wall, txts[3]));
      }
    );
  }

  if(isNewLink){
    if( wall === 2 || wall === 3 ) postContainer.rotation.x = rotation;
    else postContainer.rotation.y = rotation;
  } else {
    postContainer.rotation.set(xRotation, yRotation, zRotation);
    postContainer.token_name = txts[8];
    postContainer.linkId = txts[9];
  }

  if(index !== null || txts[3] == 'no-url') {
    postContainer.linkId = index;
    // if(postContainer.isImage)  metaData.title = urlToTitle(postContainer.name);
    links.push(postContainer);
    scene.add(group);
  }

  if(isNewLink)
    return postContainer;
  else
    return false;
}

function urlToTitle(url) {
  var img_url = url.split(/(.jpg|.png|.gif|.jpeg)/)[0].split('/');
  return img_url[img_url.length - 1];
}

function countWall(wall) {
  switch(wall) {
    case 4:
      return firstWall;
    case 1:
      return leftWall;
    case 0:
      return rightWall;
    case 5:
      return backWall;
    case 2:
      return ceiling;
    case 3:
      return floor;
  }
}


function gridSpace(grid) {
  switch(grid) {
    case 2: return 4;
    case 3: return 2;
    case 4: return 1.333335;
    case 5: return 1;
    case 6: return 0.80;
    case 7: return 0.665;
    case 8: return 0.57;
  }
}


function getTitleColor(wall) {
  return 0x000000;
}


function makeImg(image, x, y, z, name, anImage, wall, addlink){
  var img, width = linkContainerW, height = linkContainerH/2;

  // console.log(image.image.width)
  // console.log(image.image.height)

  if(addlink === "no-url") width-=0.25;

  if(anImage) {
    height = linkContainerH - (linkContainerH/6.10) + 0.2;
    img = new THREE.PlaneGeometry(width, height);
  } else {
    if(image.image.width == image.image.height)
      img = new THREE.PlaneGeometry( height * .73, height * .78 );
    else if(image.image.width > image.image.height){
      img = new THREE.PlaneGeometry(width * .73, height * .73);
    } else
      img = new THREE.PlaneGeometry(height, height * (image.image.width/image.image.height));
  }

  var img_txture = image.image
  var img_cont_ratio = width/height

  var imgMaterial = new THREE.MeshBasicMaterial({map: image, side: THREE.DoubleSide, color: 0xffffff,
    transparent: true})

  var imgContainer = new THREE.Mesh(img, imgMaterial);

  imgPos = iconPosition(wall, x, y, z, width, height);
  
  if(anImage) {
    image.wrapS = THREE.RepeatWrapping
    image.wrapT = THREE.RepeatWrapping
    image.repeat.set( 0.5, 0.5);
    image.offset.x = 0.25
    image.offset.y = 0.25
    image.needsUpdate = true
    var ImgOnlyPos = imgOnly(wall, imgPos.x, imgPos.y, imgPos.z)
    imgContainer.position.set( ImgOnlyPos.x, ImgOnlyPos.y, ImgOnlyPos.z );
  } else {
    // imgContainer.scale.y = 1
    // imgContainer.scale.x = width/height
    var withMetas = imgWithMetas(wall, imgPos.x, imgPos.y, imgPos.z)
    imgContainer.position.set( withMetas.x, withMetas.y, withMetas.z );
  }

  imgContainer.rotation.set( imgPos.roX, imgPos.roY, imgPos.roZ );

  imgContainer.contname = 'icon';
  return imgContainer;
}


function imgOnly(wall, pos_x, pos_y, pos_z) {
  switch( wall ) {
    case 0:
    case 1:
    case 4:
    case 5:
      pos_y = pos_y - (linkContainerH/6.10) - 0.6; break;
    case 2:
      pos_z = pos_z - (linkContainerH/6.10) - 0.6; break;
    case 3:
      pos_z = pos_z + (linkContainerH/6.10) + 0.6; break;
  }

  return {
    x: pos_x, y: pos_y, z: pos_z 
  }
}


function imgWithMetas(wall, pos_x, pos_y, pos_z) {
  switch( wall ) {
    case 0:
    case 1:
    case 4:
    case 5:
      pos_y = pos_y - 0.4; break;
    case 2:
      pos_z = pos_z - 0.4; break;
    case 3:
      pos_z = pos_z + 0.4; break;
  }

  return {
    x: pos_x, y: pos_y, z: pos_z 
  }
}


function getEmoji(type, wall, x, y, z, group) {
  var storage     = firebase.storage();
  var ref_storage = storage.ref(['emojis', type + '.png'].join('/'));

  ref_storage.getDownloadURL().then(function(url) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function(event) {
      var blob = xhr.response;

       var reader = new FileReader();
       reader.readAsDataURL(blob); 
       reader.onloadend = function() {
        base64data = reader.result;

        var emojiLoader = new THREE.TextureLoader();
        emojiLoader.load(
          base64data,
          function(texture){
            var icon_curr = iconPosition(wall, x, y, z, 4, 4),
                icon_pos = emojiIconPosition(wall, icon_curr.x, icon_curr.y, icon_curr.z);;

            var emoji = new THREE.PlaneGeometry( 4, 4 );
            var emojiMaterial = new THREE.MeshBasicMaterial({map: texture}),
                emojiContainer = new THREE.Mesh(emoji, emojiMaterial);

            emojiContainer.contname = 'emojicon';
            
            emojiContainer.position.set( icon_pos.x, icon_pos.y, icon_pos.z );
            emojiContainer.rotation.set( icon_curr.roX, icon_curr.roY, icon_curr.roZ );

            group.add(emojiContainer);

          },
          function(xhr){},
          function(xhr){
            alert("Error on displaying image.");
          }
        );
       }
    };
    xhr.open('GET', url);
    xhr.send();
  });
}


function addDelete(wall, x, y, z, group) {
  var storage     = firebase.storage();
  var ref_storage = storage.ref(['emojis', 'delete.png'].join('/'));
  // console.log(ref_storage)

  ref_storage.getDownloadURL().then(function(url) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function(event) {
      var blob = xhr.response;

       var reader = new FileReader();
       reader.readAsDataURL(blob); 
       reader.onloadend = function() {
        base64data = reader.result;

        var emojiLoader = new THREE.TextureLoader();
        emojiLoader.load(
          base64data,
          function(texture){
            var icon_curr = iconPosition(wall, x, y, z, 4, 4),
                icon_pos = delIconPosition(wall, icon_curr.x, icon_curr.y, icon_curr.z);

            var emoji = new THREE.PlaneGeometry( 4, 4 );
            var emojiMaterial = new THREE.MeshBasicMaterial({map: texture}),
                emojiContainer = new THREE.Mesh(emoji, emojiMaterial);

            emojiContainer.contname = 'delicon';
            
            emojiContainer.position.set( icon_pos.x, icon_pos.y, icon_pos.z );
            emojiContainer.rotation.set( icon_curr.roX, icon_curr.roY, icon_curr.roZ );

            group.add(emojiContainer);

          },
          function(xhr){},
          function(xhr){
            alert("Error on displaying image.");
          }
        );
       }
    };
    xhr.open('GET', url);
    xhr.send();
  });
}


function makeEmoji(wall, x, y, z) {
  var width = linkContainerW, height = linkContainerH/6.10;

  var emojCurr = iconPosition(wall, x, y, z, width, height);

  var emoji_bg = new THREE.PlaneGeometry(width, height);
  var emojiMaterial = new THREE.MeshBasicMaterial({color: 0x24394b } );
  var emojiContainer = new THREE.Mesh(emoji_bg, emojiMaterial);

  emojiContainer.contname = 'emojibg';

  var metaAxes = getChildMetaAxes(wall, x, y, z, -1),
      emojiPos = emojiBgPosition(wall, emojCurr.x, emojCurr.y, emojCurr.z);

  emojiContainer.position.set( emojiPos.x, emojiPos.y, emojiPos.z );
  emojiContainer.rotation.set( emojCurr.roX, emojCurr.roY, emojCurr.roZ );
  
  return emojiContainer;
}


function emojiIconPosition(wall, x, y, z) {
  var bg_x, bg_y, bg_z;

  switch(wall) {
    case 4:
      y += linkContainerH/2.65;
      x -= linkContainerW/2 - 2.5;
      z += 0.2;
      break;
    case 5:
      y += linkContainerH/2.65;
      x += linkContainerW/2 - 2.5;
      z -= 0.2;
      break;
    case 1:
      y += linkContainerH/2.65;
      x += 0.2;
      z += linkContainerW/2 - 2.5;
      break;
    case 0:
      y += linkContainerH/2.65;
      x -= 0.2;
      z -= linkContainerW/2 - 2.5;
      break;
    case 2:
      z += linkContainerH/2.65;
      y -= 0.2;
      x -= linkContainerW/2 - 2.5;
      break;
    case 3:
      z -= linkContainerH/2.65;
      y += 0.2;
      x -= linkContainerW/2 - 2.5;
      break;
  }

  return {
    x: x, y: y, z: z
  };
}


function delIconPosition(wall, x, y, z) {
  var bg_x, bg_y, bg_z;

  switch(wall) {
    case 4:
      y += linkContainerH/2.65;
      x += linkContainerW/2 - 2.15;
      z += 0.2;
      break;
    case 5:
      y += linkContainerH/2.65;
      x -= linkContainerW/2 - 2.15;
      z -= 0.2;
      break;
    case 1:
      y += linkContainerH/2.65;
      x += 0.2;
      z -= linkContainerW/2 - 2.15;
      break;
    case 0:
      y += linkContainerH/2.65;
      x -= 0.2;
      z += linkContainerW/2 - 2.15;
      break;
    case 2:
      z += linkContainerH/2.65;
      y -= 0.2;
      x += linkContainerW/2 - 2.15;
      break;
    case 3:
      z -= linkContainerH/2.65;
      y += 0.2;
      x += linkContainerW/2 - 2.15;
      break;
  }

  return {
    x: x, y: y, z: z
  };
}


function emojiBgPosition(wall, x, y, z) {
  var bg_x, bg_y, bg_z;

  switch(wall) {
    case 2:   z += linkContainerH/3.15; break;
    case 3:   z -= linkContainerH/3.15; break;
    default:  y += linkContainerH/3.15;
  }

  return {
    x: x, y: y, z: z
  };
}


function iconPosition(wall, x, y, z, width, height) {
  var metaAxes = getChildMetaAxes(wall, x, y, z, -1);

  var icon_x, icon_z,
      icon_y = metaAxes.position.y + width/8;

  switch(wall) {
    case 4:
      icon_x = metaAxes.position.x + 1.58;
      icon_z = metaAxes.position.z;
      break;
    case 1:
      icon_x = metaAxes.position.x;
      icon_z = metaAxes.position.z - 1.58;
      break;
    case 0:
      icon_x = metaAxes.position.x;
      icon_z = metaAxes.position.z + 1.58;
      break;
    case 5:
      icon_x = metaAxes.position.x - 1.58;
      icon_z = metaAxes.position.z;
      break;
    case 2:
      icon_z = metaAxes.position.z + width/8;
      icon_x = metaAxes.position.x + 1.58;
      icon_y = metaAxes.position.y;
      break;
    case 3:
      icon_z = metaAxes.position.z - width/8;
      icon_x = metaAxes.position.x + 1.58;
      icon_y = metaAxes.position.y;
      break;
  }

  return {
    x: icon_x,
    y: icon_y,
    z: icon_z,
    roX: metaAxes.rotation.x,
    roY: metaAxes.rotation.y,
    roZ: metaAxes.rotation.z
  };
}


function createText(font, fontColor, theText, x, y, z, aTitle, wall){
  var name = "description";

  if(aTitle){
    // linkContainerW/19
    fontSize = 1.5;
    name = "title";
  }
  else{
    // linkContainerW/19
    fontSize = 1.5;
  }

  var rotation = 0;
  var titleGroup = new THREE.Group();
  var geometry = new THREE.TextGeometry(theText, {
    font: font,
    size: fontSize,
    height: 0.01,
    curveSegments: 1
  });

  txtMaterials = [
    new THREE.MeshBasicMaterial({color: fontColor, overdraw: 0.5 }),
    new THREE.MeshBasicMaterial( { color: 0x000000, overdraw: 0.01 } )
  ];

  geometry.computeBoundingBox();

  geometry.verticesNeedUpdate = true;
  geometry.elementsNeedUpdate = true;
  geometry.morphTargetsNeedUpdate = true;
  geometry.uvsNeedUpdate = true;
  geometry.normalsNeedUpdate = true;
  geometry.colorsNeedUpdate = true;
  geometry.tangentsNeedUpdate = true;

  var txtMesh = new THREE.Mesh(geometry, txtMaterials);

  var textPos = textPosition(wall, x, y, z, aTitle);

  txtMesh.position.set( textPos.x, textPos.y, textPos.z );
  txtMesh.rotation.set (textPos.roX, textPos.roY, textPos.roZ );

  titleGroup.add(txtMesh);
  titleGroup.contname = name;
  return titleGroup;
}


function textPosition(wall, x, y, z, title) {
  var width = linkContainerW/8, height = linkContainerH/4;

  var metaAxes = getChildMetaAxes(wall, x, y, z, 0);

  var text_x, text_z,
    text_y = metaAxes.position.y - (height - 1);

  switch(wall) {
    case 4:
      text_x = metaAxes.position.x - width;
      text_x -= linkContainerW/4 - 1;
      text_z = metaAxes.position.z;
      break;
    case 1:
      text_x = metaAxes.position.x;
      text_z = metaAxes.position.z + width;
      text_z += linkContainerW/4 - 1;
      break;
    case 0:
      text_x = metaAxes.position.x;
      text_z = metaAxes.position.z - width;
      text_z -= linkContainerW/4 - 1;
      break;
    case 5:
      text_x = metaAxes.position.x + width;
      text_z = metaAxes.position.z;
      text_x += linkContainerW/4 - 1;
      break;
    case 3:
      text_z = metaAxes.position.z + (height - 1);
      text_x = metaAxes.position.x - width;
        text_x -= linkContainerW/4 - 1;
      text_y = metaAxes.position.y;
      break;
    case 2:
      text_z = metaAxes.position.z - (height - 1);
      text_x = metaAxes.position.x - width;
      text_x -= linkContainerW/4 - 1;
      text_y = metaAxes.position.y;
      break;
  }

  if(!title) {
    if(wall ===2)         text_z -= width*2 - 2;
    else if( wall === 3 ) text_z += width*2 - 2;
    else                  text_y -= width*2 - 2;
  }

  return {
    x: text_x,
    y: text_y,
    z: text_z,
    roX: metaAxes.rotation.x,
    roY: metaAxes.rotation.y,
    roZ: metaAxes.rotation.z
  };
}


function strToNewLine(text, limitChars, limitLines, aTitle){
  var x=1, newStr = [], pullText = "", startIndex = 0, breaker, newLine = "",
      strText = text;
  do {
    pullText = text.slice(0, limitChars).lastIndexOf(" ");

    if(x<limitLines) {
      if(text.length > limitChars)
        newLine = "\n";
      else
        newLine = " ";

      if(pullText === -1) {
        newStr.push(text.slice(0, limitChars) + newLine);
        startIndex = limitChars;
      } else {
        newStr.push(text.slice(0, pullText) + newLine);
        startIndex = pullText+1;
      }
    } else {
      newStr.push(text.slice(0, text.length));
    }

    text = text.slice(startIndex, text.length);
    x++;

    if ( !aTitle ){
      breaker=text.length;
    }
    else {
      breaker = limitLines;
    }
  } while(x<=breaker);

  var description = newStr.join('');

  if(description.length < strText.length)
    description += text;

  if((description.length >= (limitChars*limitLines))){
    if(!aTitle){
      // (limitChars*limitLines)-26
      description = description.slice(0, (limitChars*limitLines)-10)  + "  [. . .]";
    } else {
      description = description.slice(0, (limitChars*limitLines)-9) + "...";
    }
  }
  return description;
}


function getChildMetaAxes(wall, x, y, z, identifier) {
  var title = identifier === 1,
      descr = identifier === 0,
      icon  = identifier === -1;

  var position, rotation = 0, axisRot;

  switch(wall) {
    case 4:
      if(title) position = {x: x - 0.7, y: y + 0.75, z: z};
      else if(descr) position = {x: x - 2.375, y: y - 0.525, z: z};
      else position = {x: x - 1.58, y: y + 0.7, z: z + 0.01};
    break;

    case 1:
      if(title) position = {x: x, y: y + 0.75, z: z + 0.7};
      else if(descr) position = {x: x, y: y - 0.525, z: z + 2.375};
      else  position = {x: x + 0.01, y: y + 0.7, z: z + 1.58};
      rotation = Math.PI / 2;
    break;

    case 5:
      if(title) position = {x: x + 0.7, y: y + 0.75, z: z};
      else if(descr) position = {x: x + 2.375, y: y - 0.525, z: z};
      else position = {x: x + 1.58, y: y + 0.7, z: z - 0.01};
      rotation = Math.PI;
    break;

    case 0:
      if(title) position = {x: x, y: y + 0.75, z: z - 0.7};
      else if(descr) position = {x: x, y: y - 0.525, z: z - 2.375};
      else  position = {x: x - 0.01, y: y + 0.7, z: z - 1.58};
      rotation = (Math.PI) + (Math.PI / 2);
    break;

    case 3:
      if(title) position = {x: x - 0.7, y: y, z: z - 0.7};
      else if(descr) position = {x: x - 2.375, y: y, z: z + 0.525};
      else  position = {x: x - 1.58, y: y + 0.01, z: z - 0.7};
      rotation = -Math.PI / 2;
    break;

    default:
      if(title) position = {x: x - 0.7, y: y, z: z + 0.7};
      else if(descr) position = {x: x - 2.375, y: y, z: z - 0.525};
      else  position = {x: x - 1.58, y: y - 0.01, z: z + 0.7};
      rotation = Math.PI / 2;
  }

  if( wall === 2 || wall === 3 )  axisRot = {x: rotation, y: 0, z: 0};
  else              axisRot = {x: 0, y: rotation, z: 0};

  return  {position: position, rotation: axisRot};
}


function showLoader() {
  controls.noRotate = true;
  txtLink.hide();
  var loaderHolder = $('.loader-holder'),
      loaderAnimation = document.createElement("img");
  $('#loader').show();
  loaderAnimation.src = "/assets/giphy.gif";

  if(window.innerWidth > 590) {
    loaderHolder.parent().css({
      'display': 'block',
    });
    loaderHolder.css('height', '100%');
    loaderAnimation.style.height = '100%';
    loaderAnimation.style.width = 'auto';
  } else {
    // loaderAnimation.style.height = '0';
    loaderAnimation.style.width = '100%';
    loaderAnimation.style.height = 'auto';
    loaderHolder.css('height', 'fit-content');
    loaderHolder.parent().css({
      'display': 'flex',
      'align-items': 'center'
    });
  }

  loaderHolder.append(loaderAnimation);
  setTimeout(function() {
    loaderHolder.addClass('play');
  }, 100);
}


function adjustLoader() {
  var holder = $('.loader-holder');
  if(holder.hasClass('play')) {
    var loaderImg = holder.children('img');
    if(window.innerWidth > 590) {
      holder.parent().css({
        'display': 'block',
      });
      holder.css('height', '100%');
      loaderImg.css('width', 'auto');
      loaderImg.css('height', '100%');
    } else {
      holder.parent().css({
        'display': 'flex',
        'align-items': 'center'
      });
      loaderImg.css('width', '100%');
      loaderImg.css('height', 'auto');
      holder.css('height', 'fit-content');
    }
  }
}


function hideLoader() {
  var loader = $('.loader-holder');
  setTimeout(function() {
    $('#loader').hide();
    loader.removeClass('play');
    loader.html('');
    txtLink.show();
    controls.noRotate = false;
    if(aMobile)
      $('#log-out-holder').show(100);
  }, 1000);
}


function isMobile(){
  if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|android|iphone|iPhone|ipad|playbook|silk|Mobile|Tablet|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(window.navigator.userAgent)){
    $('#text-holder').slideDown(100);
    $('.info').slideUp(50);
    return true;
  }
  return false;
}


function isDropboxFile(url) {
  return new RegExp(/(.*\bdropbox.com\b.*\bpreview\b)/).test(url);
}


function isBase64(url){
  return new RegExp(/(\bdata:\b.*\bbase64\b)/).test(url);
}


function isValidLink(url) {
  var pattern = /^((https|http):\/\/(\d+(\.\d+){3}:\d+|\S+([\.](\S+)){2}|(\S+)(:\d+))(((\/\S+)*(\/?|\?|\?\S+.*)?)|\?\S+.*)?)$/;
  return pattern.test(url);
}


function isImagePost(url) {
  return new RegExp(/(.jpg|.png|.gif|\bdata:\b.*\bbase64\b|.*\bdropbox.com\b.*\bpreview\b)/).test(url);
}

var rand = function() {
    return Math.random().toString(36).substr(2); // remove `0.`
};

var token = function() {
    return rand() + rand(); // to make it longer
};