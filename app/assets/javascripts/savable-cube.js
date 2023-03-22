
var cube_id = "";
var link_added_count = 0, link_added_total = 0, initial_load=true;
(function(){
  $('.info .mobile-logout').addClass("d-flex").show();
  $('.info .desktop-logout').addClass("d-flex").show();
  // if(hasChild('#interior_cube'))
  //   showLoader();
}());

$(document).on('turbolinks:load', function() {

  $('#logout_user').click(function(e){
      e.preventDefault();
      signOutUser();
      if($('ul.info-menu.un-auth').is(":visible"))
        window.location.href = window.location.origin;
  });

  if($('ul.info-menu.un-auth').is(":visible")) {
    var unAuth = $('ul.info-menu.un-auth');
    unAuth.children('.profile').remove();
  }



  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // console.log(use

      if(sessionStorage.getItem("not_collaborator")) {
        alert(sessionStorage.getItem("not_collaborator"))
        sessionStorage.removeItem("not_collaborator")
      }

      removeSigninRegister();
      $('#section-2-b').detach();
      // if($(!'ul.info-menu.un-auth').is(":visible"))
      //   window.location.href = [window.location.origin, 'users'].join('/');

      var pathname = window.location.pathname.split('/');

      var is_grid_page = window.location.pathname == '/accounts/cubes' && pathname[pathname.length-1] == 'cubes'
      if(window.location.pathname == '/accounts/profile' || (is_grid_page))
        firebase.database().ref("Users/" + user.uid).once('value')
        .then(function(snapshot){
          try {
            if(snapshot.val().bgImg)
              $('html').css('background-image', 'url(' + snapshot.val().bgImg + ')');
              // $('html').attr('data-bg', 'url(' + snapshot.val().bgImg + ')');
          } catch(e) {}
        });

      
      cube_id = pathname[pathname.length-1];
      if(hasChild('#interior_cube')) {
        firebase.database().ref(['Cubes', user.uid, cube_id].join('/')).once('value')
        .then(function(owner) {
          if(owner.val()) {
            $('html').css('background-image', 'url(' + owner.val().bgImg + ')');
            ownerStat = { owner: true, walls: [0,1,2,3,4,5] };
          } else {
            firebase.database().ref(['CubeCollaborators', cube_id, user.uid].join('/')).once('value')
            .then(function(collab) {
              if(collab.val()){
                ownerStat = { owner: true, walls: [parseInt(collab.val().wall)] };
                
                firebase.database().ref(['Cubes', collab.val().owner, cube_id].join('/')).once('value')
                .then(function(owner) {
                  if(owner.val()) {
                    $('html').css('background-image', 'url(' + owner.val().bgImg + ')');
                  }
                });

              }
            });
          }
        });


        // firebase.database().ref("Links/" + cube_id).once('value')
        // .then(function(snapshot){

        //   if(snapshot.val()) {
        //     $.each(snapshot.val(), function(key, value){
        //         lazyFetchDetails(value, key);
        //     });
        //     // hideLoader();
        //     bulkUpdateLinks(cube_id);
        //   } else {
        //     var  url     = window.location.href.split('/'),
        //       cube_id = url[url.length-1];
        //     firebase.database().ref(["Cubes", user.uid, cube_id].join('/'))
        //     .once('value').then(function(snap) {
        //       if(!snap.val()) {
        //         $('#collabs-holder .panel .wraplist .add-collab').remove();
        //       } else {
        //         for(var ctr=0; ctr<6; ctr++) {
        //           drawEmptyLinks(ctr);
        //         }
        //       }
        //     });
        //   }
        //   disableChangeFace = false;
        // });

        

        firebase.database().ref("Links/" + cube_id).once('value', function(added_links) {
          if(!added_links.val()) {
            for(var ctr=0; ctr<=5; ctr++) drawEmptyLinks(ctr);
          } else {
            link_added_total = added_links.numChildren();
          }

          firebase.database().ref("Links/" + cube_id).on('child_added', function(snapshot){
            snaps = snapshot.val()
            if(snaps) {
              // var group_conts = scene.children.filter(function( l ) {
              //   return (l.type == "Group");
              // });

              // $.each(snaps, function(key, value){
              //   var has_match = false;
              //   $.each(group_conts, function(gc_k, gc) {

              //     $.each(gc.children, function(gcc_k, gcc) {
              //       if(gcc.linkId == snaps.key) has_match = true
              //     })
              //   })

              //   if(!has_match) lazyFetchDetails(snaps, snaps.key);
              // });
              if(emptylinks > 0) clearEmptyLinks();
              lazyFetchDetails(snaps, snaps.key);

              if(initial_load) {
                link_added_count++;

                if(link_added_count == link_added_total) {
                  for(var ctrw=0; ctrw<=5; ctrw++) reorderWallLinks(ctrw);
                  initial_load = false
                }
              }

              
              // hideLoader();
              // bulkUpdateLinks(cube_id);
            } else {
              var  url     = window.location.href.split('/'),
                cube_id = url[url.length-1];
              firebase.database().ref(["Cubes", user.uid, cube_id].join('/'))
              .once('value').then(function(snap) {
                if(!snap.val()) {
                  $('#collabs-holder .panel .wraplist .add-collab').remove();
                } 
                // else {
                //   for(var ctr=0; ctr<6; ctr++) {
                //     drawEmptyLinks(ctr);
                //   }
                // }
              });
            }
            disableChangeFace = false;
          });
        });


        firebase.database().ref("Links/" + cube_id).on('child_removed', function(snapshot){
          snaps = snapshot.val()
          if(snaps) {
            var pin_id = undefined;

            $.each(links, function(pin, pval) {
              if(snaps.key === pval.linkId) pin_id = pin;
            });

            if(pin_id !== undefined) {
              var holder_group = scene.children.filter(function( l ) {
                var cont_mesh = l.children.filter(function( l ) {
                  return (l.contname == "metaholder");
                })[0];
                return (l.type == "Group" && cont_mesh.linkId == snaps.key);
              })[0];

               var holder = getObjectByContName(holder_group.children, "metaholder")

              
              // if(holder.pinFormat === 'file') {
              //   var refstor = firebase.storage().ref().child(
              //         ['PinFiles', cube_id, holder.linkId, holder.token_name].join('/')
              //       );
                
              //   refstor.delete();
              // }

              $('#walls-holder').find('li#' + snaps.key).remove();

              scene.remove(holder);
              scene.remove(holder.parent);
              links.splice(pin_id, 1);

              updateSucceedingLinks(holder, false)

              if(!links.length) {
                for(var ctr=0; ctr<=5; ctr++) {
                  drawEmptyLinks(ctr);
                }
              }
            }
          }
        });


        firebase.database().ref("Links/" + cube_id).on('child_changed', function(snapshot){
          snaps = snapshot.val()
          if(snaps) {
            var group = scene.children.filter(function( l ) {
              var cont_mesh = l.children.filter(function( l ) {
                return (l.contname == "metaholder");
              })[0];
              return (l.type == "Group" && cont_mesh.linkId == snaps.key);
            })[0];

            holder = getObjectByContName(group.children, "metaholder")
            // console.log(holder.linkId + ": " + holder.faceIndex)

            if(unequalPos(holder, snaps)) {
              holder.position.set(snaps.position.x, snaps.position.y, snaps.position.z);
              
              holder.initPos.x = holder.position.x;
              holder.initPos.y = holder.position.y;
              holder.initPos.z = holder.position.z;

              if(!unequalRot(holder, snaps)) rotateToWall(holder.faceIndex, {object: holder}, true);
            }

            if(unequalRot(holder, snaps)) {
              $('#walls-holder').find('li#' + snaps.key).remove();

              holder.initRot = {
                x: snaps.rotation.x,
                y: snaps.rotation.y,
                z: snaps.rotation.z
              };

              holder.rotation.x = snaps.rotation.x;
              holder.rotation.y = snaps.rotation.y;
              holder.rotation.z = snaps.rotation.z;

              repositionObjChild({object: holder}, snaps.wall, true);
      
              $.extend(snaps, {id: snaps.key});
              if(!snaps.title) snaps.title = urlToTitle(snaps.url);
              addLinkToSidebar(snaps);
            }

            // console.log(holder)


            holder.faceIndex = snaps.wall

            reorderWallLinks(snaps.wall)
          }
        });
      }
    } else {
      if(!$('ul.info-menu.un-auth').is(":visible")) {
        loc = ''

        if(window.location.pathname.includes('/accounts/cubes')){
          loc = '/accounts/sign_in'
          sessionStorage.setItem("cube_redirect", window.location.pathname);
        }

        window.location.href = window.location.origin + loc;
      }
      else {
        removeLogout();
      }
    }

    function removeLogout() {
      var hasSignIn   = hasChild('ul.info-menu .register'),
          hasSignOut  = hasChild('ul.info-menu .sign-in');

      if(!hasSignIn && !hasSignOut) {
        $('.pull-right ul.info-menu').append(
          '<li class="register showopacity" id="signup" style="">' +
            '<a style="color: white;text-decoration: none;font-size: 13px;" href="#section-2-b">SIGN UP</a>' +
          '</li>'
        );

        $('#signup.register').click(function(e) {
          e.preventDefault();
          var s2Elem = $(this).children('a').attr('href');
          $('html, body').animate({scrollTop: $(s2Elem).offset().top - 60}, 500);
        });
      } else {
        signIn  = $('ul.info-menu').children('.sign-in').show();
        signOut = $('ul.info-menu').children('.register').show();
      }
      $('ul.info-menu').children('.logout').remove();
    }
  });

  function removeSigninRegister() {
    if(hasChild('ul.info-menu .logout')) {
      $('ul.info-menu').children('.logout').show();
    } else {
      $('.pull-right ul.info-menu').append(
        '<li class="logout showopacity" style="">' +
          '<a id="logout_user" style="color: white;text-decoration: none;" href="/users">LOG OUT</a>' +
        '</li>'
      );

      $('#logout_user').click(function(e){
        e.preventDefault();
        signOutUser();
      });
    }
    $('ul.info-menu').children('.sign-in').remove();
    $('ul.info-menu').children('.register').remove();
  }

});

function bulkUpdateLinks() {
  setTimeout(function() {
    var user = firebase.auth().currentUser;
    firebase.database().ref("Links/" + cube_id).once('value')
    .then(function(snapshot){
      
        $.each(snapshot.val(), function(key, value){
          if(value.pinFormat === 'file')
            return;

          fetchLinkDetails(value.url, value.wall, true, key);
        });
        disableChangeFace = false;
      
    });
  }, Math.floor( 400 + Math.random() * 2000 ));
}


function signOutUser(){
  var updateUser  = firebase.database().ref(["Users", firebase.auth().currentUser.uid].join('/'));
  updateUser.update({
    status      : 'offline'
  }, function() {
    firebase.auth().signOut();
  });
}

function hasChild(elem) {
  return $(document).has(elem).length > 0;
}

function getUserInfo(id) {
  return firebase.database().ref("Users/" + id).once('value')
  .then(function(snapshot){
    return snapshot.val();
  });
}

function getProfileQuestion(id) {
  return firebase.database().ref([
    "Questions", "ProfileQuestion", suggestion.key, 'choices'
  ].join('/')).once('value').then(function(snap){
    return snap.val();
  });
}

function calculatatePercentage(elem, percent) {
  var progress  = elem.find('.progress-bar'),
      label     = elem.find('.progress-bar .sr-only');

  progress.css('width', percent + '%');
  progress.attr('aria-valuenow', percent);

  if (percent < 100 ) {
    label.css('position', 'relative');
  } else {
    label.css('position', 'relative');
  }

  label.text(percent + '% Complete');
}


