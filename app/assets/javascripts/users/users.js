var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
      try {
        var matches, substrRegex;

        matches = [];

        substrRegex = new RegExp(q, 'i');

        $.each(strs, function(i, str) {
            if (substrRegex.test(str.value)) {
              matches.push({
                  value: str.value,
                  key: str.key
              });
            }
        });
      } catch(e) {
        return [];
      }

      cb(matches);
  };
};

$( document ).on('turbolinks:load', function() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      var cubesResult = [],
          url     = window.location.href.split('/'),
          cube_id = url[url.length-1];

      $('.info-menu .profile').addClass('showopacity');
      if($(document).has('.show-profile').length > 0) {
        initUserMethods(user);
        showProfile();
      }
      if($(document).has('.edit-profile').length > 0) {
        initEditUserMethods(user);
        editProfile();
      }

      if(hasChild('input#collab') || hasChild('#txt-add-collab') || hasChild('#wall-collab-entry')) {
        $('input#added-collab').tagsinput({
          freeInput: false,
          allowDuplicates: false,
          itemValue: 'key',
          itemText: 'value'
        });

        var sorted_emails = [];
        firebase.database().ref("Users").once('value')
        .then(function(snap){
          var emails = [];
          $.each(snap.val(), function(key, val) {
            if(key != "userId" && val.email !== firebase.auth().currentUser.email)
              emails.push({value: val.email, key: key});
          });
          emails.sort(function(a,b) {
            if(a.value === undefined || b.value === undefined)
              return;

            var nameA = a.value.toLowerCase(); // ignore upper and lowercase
            var nameB = b.value.toLowerCase(); // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          });

          if(hasChild('input#collab')) {
            $('#collab').keypress(function(e){
              var key = e.which;
              if (key == 13)
              {
                $('input#added-collab').tagsinput('add', $(this).val());
                $(this).val('');
              }
            });

            $('#collab').typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            }, {
                name: 'emails',
                displayKey: 'value',
                source: substringMatcher(emails)
            }).bind('typeahead:selected', function(ev, suggestion) {
              // console.log(suggestion);
              if($(this).val()!== "") {
                if(hasChild('input#added-collab')) {
                  $('input#added-collab').tagsinput('add', suggestion);
                  $(this).val('');
                }
                else {
                  var okBtn = $('div[aria-describedby="dialog_add_collab"]').find('.ui-dialog-buttonset');
                  okBtn.children('button:first-child').attr('data-collab-id', suggestion.key);
                }
              }
            }).blur(function() {
              if(hasChild('input#added-collab')) $(this).val('');
            });
          } else if(hasChild('#txt-add-collab')) {
            var select_flag = false
            var selected_collab = undefined
            $('#txt-add-collab').typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            }, {
                name: 'emails',
                displayKey: 'value',
                source: substringMatcher(emails)
            }).bind('typeahead:selected', function(ev, suggestion) {
              selected_collab = suggestion
              select_flag = true;
            }).blur(function() {
            });

            $('#invite-email').click(function() {
              if(!selected_collab) return false;

              var currUser      = firebase.auth().currentUser,
                  sendCollabs   = firebase.functions().httpsCallable('sendCubeCollabs');

              firebase.database().ref(['CubeReq', cube_id, selected_collab.key].join('/'))
              .once('value').then(function(req) {
                if( req.val() ){
                  showErrorMessage(selected_collab.value + " has been added already.");
                } else {
                  firebase.database().ref(['CubeCollaborators', cube_id, selected_collab.key].join('/'))
                  .once('value').then(function(addCollab) {
                    if( addCollab.val() ){
                      showErrorMessage(selected_collab.value + " is already a collaborator.");
                    } else {
                      firebase.database().ref(['Cubes', currUser.uid, cube_id].join('/'))
                      .once('value').then(function(cube) {

                        $( "#dia_collab_confirm" ).dialog({
                          modal: true,
                          open: function(event, ui) {

                            $(this).find('span').text(selected_collab.value);
                          },
                          buttons: {
                            'OK': function () {
                              $('#sendInvite').modal('show');
                              var theCube = cube.val();
                              var uid   = selected_collab.key,
                                  wall  = $("#txt-add-collab").attr('data-wall');

                              var userA = getUserInfo(uid);
                                  userB = getUserInfo(currUser.uid);

                              var recipient = "",
                                  owner = "";

                              Promise.all([userA, userB]).then(function(res) {
                                var collabReq = firebase.database().ref([
                                                  'CubeReq', cube_id, uid, res[1].userId]
                                                .join('/'));
                                collabReq.set({
                                  name: [res[1].firstname, res[1].lastname].join(' '),
                                  image: res[1].image ? res[1].image : '',
                                  cube: cube_id,
                                  cubeName: theCube.name,
                                  wall: wall
                                });
                                recipient = [res[0].firstname, res[0].lastname].join(' ');
                                owner = [res[1].firstname, res[1].lastname].join(' ');
                              }).then(function(){
                                sendCollabs({
                                  from: firebase.auth().currentUser.email,
                                  to:   selected_collab.value,
                                  cube: {name: theCube.name, url:  window.location.origin + '/accounts/cubes', recipient: recipient, owner: owner, appurl: window.location.origin}
                                }).then(function(result) {
                                  if(result.data.success) {
                                    showSuccess(result.data.msg);
                                    $('#txt-add-collab').val('')
                                    selected_collab = undefined
                                    $('#sendInvite').modal('hide');
                                  }
                                });
                              });

                              $(this).dialog('close');
                            },
                            'Cancel': function () {
                              $(this).dialog('close');
                              $('#txt-add-collab').val('')
                              selected_collab = undefined
                            }
                          },
                          overlay: "background-color: red; opacity: 0.5"
                        });
                      });
                    }
                  });
                }
              });
            })
          }

          if(hasChild('#wall-collab-entry')) {
            var select_flag = false;
            var wall_controls = '#red-wall-control, #magenta-wall-control, #sky-blue-wall-control';
            wall_controls += ', #yellow-wall-control, #blue-wall-control, #green-wall-control';

            $(wall_controls).typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            }, {
                name: 'emails',
                displayKey: 'value',
                source: substringMatcher(emails)
            }).bind('typeahead:open', function(ev, suggestion) {
              select_flag = false;
            }).bind('typeahead:selected', function(ev, suggestion) {
              var wall  = $(this).attr('data-wall'),
                  prev  = toEmails.filter(function( obj ) {
                            return obj === suggestion.value;
                          });

              if( prev.length < 1 ) {
                select_flag = true;
                confirmAdd(suggestion, wall, $(this));
              } else{
                showErrorMessage( "Email " + suggestion.value + 
                                  " was already added as a collaborator." );
              }
            }).blur(function(e) {
              if (!select_flag) {
                var input_email = $(this).val();
                if (input_email.length > 0 && validateEmail(input_email)) {
                  var wall  = $(this).attr('data-wall'),
                    prev  = toEmails.filter(function( obj ) {
                              return obj === input_email;
                            });

                  if( prev.length < 1 ) {
                    confirmAdd({value: input_email}, wall, $(this));
                  } else
                    showErrorMessage( "Email " + input_email +
                                    " already added as a collaborator." );
                }
              }  
              $(this).val('');
              select_flag = false;
            });
          }
        });
      }

      function confirmAdd(suggestion, wall, txt_col) {
        $( "#dia_collab_confirm" ).dialog({
          modal: true,
          open: function(event, ui) {
            $(this).find('span').text(suggestion.value);
          },
          close: function(event, ui) {
            txt_col.typeahead('val', '');
          },
          buttons: {
            'OK': function () {
              email_wall[parseInt(wall)].push( $.extend(suggestion, { wall: parseInt(wall)}) );
              toEmails.push(suggestion.value);
              showSuccessMessage(suggestion.value + ' has been added.');
              $(this).dialog('close');
            },
            'Cancel': function () {
              $(this).dialog('close');
            }
          },
          overlay: "background-color: red; opacity: 0.5"
        });
      }

      $('#add-collab').click(function(e) {
        e.preventDefault();
        $( "#dialog_add_collab" ).dialog({
          modal: true,
          open: function(event, ui) {
            // email_add = $('#collab').val();
          },
          buttons: {
            'Add': function (event) {
              var addBtn    = $(event.currentTarget),
                  uid       = addBtn.attr('data-collab-id'),
                  currUser  = firebase.auth().currentUser,
                  sendInvitation = firebase.functions().httpsCallable('sendInvitation');
              if(uid) {
                // console.log(uid);

                firebase.database().ref(["Collaborations",uid,currUser.uid].join('/'))
                .once('value').then(function(snapshot) {
                  var userA = getUserInfo(uid)
                      userB = getUserInfo(currUser.uid);
                  Promise.all([userA, userB]).then(function(res) {
                    var rname = [res[0].firstname, res[0].lastname].join(' ');

                    if(!snapshot.val()) {
                      firebase.database().ref(["CollaboReq",uid,currUser.uid].join('/'))
                      .once('value').then(function(snapshot){
                        if(snapshot.val()) {
                          showErrorMessage('Request already submitted to ' + rname );
                          $('#collab').val('');
                        } else {
                          var collabReg = firebase.database().ref([
                                            'CollaboReq', uid, res[1].userId]
                                          .join('/'));
                          collabReg.set({
                            name: [res[1].firstname, res[1].lastname].join(' '),
                            image: res[1].image ? res[1].image : ''
                          });

                          sendInvitation({
                            from:     res[1].email,
                            to:       res[0].email,
                            number:   '',
                            message:  'Your are being invited to be a collaborator of ' +
                                      [res[1].firstname, res[1].lastname].join(' '),
                            url:      window.location.origin
                          }).then(function (result) {
                            showSuccess('Request was submitted to ' + rname + '.');
                          });

                          
                          $('input#collab').val('');
                        }
                      });
                    } else {
                      showErrorMessage(rname + ' is already one of your collaborators.');
                    }

                  });
                });
              } else if($('#collab').val()) {
                var recipient = $('#collab').val();
                if(validateEmail(recipient)) {
                  var sender = getUserInfo(currUser.uid);

                  Promise.all([sender]).then(function(res) {
                    sendInvitation({
                      from:     res[0].email,
                      to:       recipient,
                      number:   '',
                      message:  '',
                      url:      window.location.origin
                    }).then(function (result) {
                      showSuccess(result.data.msg);
                      $('input#collab').val('');
                    });
                  });
                } else {
                  alert('Please enter a valid email address e.g. "username@exmaple.com".');
                }
              } else
                alert('Please select a collaborator email.');
            },
            'Done': function() {
              $(this).dialog('close');
              $('input#collab').val('');
            }
          }
        });
      });

      $('.bg-image-holder .image').click(function() {
        var img   = $(this).attr('data-bg'),
            user  = firebase.auth().currentUser,
            vthis  = this;
        $('html').css('background-image', 'url(' + img + ')');

        var pathname = window.location.pathname.split('/');
        var is_grid_page = window.location.pathname == '/accounts/cubes' && pathname[pathname.length-1] == 'cubes'
        var updateBG = undefined;
        if(window.location.pathname == '/accounts/profile' || (is_grid_page)) {
          updateBG = firebase.database().ref(["Users", user.uid].join('/'));
          updateBG.update({
            bgImg: img
          }).then(function() {
            $(vthis).parent('.bg-image-holder').parent('.bg-holder-selector').slideUp('fast');
          });
        } else if(hasChild('#interior_cube')) {
          firebase.database().ref(['Cubes', user.uid, cube_id].join('/')).once('value')
          .then(function(owner) {
            if(owner.val()) {
              updateBG = firebase.database().ref(['Cubes', user.uid, cube_id].join('/'));
              updateBG.update({
                bgImg: img
              }).then(function() {
                $(vthis).parent('.bg-image-holder').parent('.bg-holder-selector').slideUp('fast');
              });
            } else {
              firebase.database().ref(['CubeCollaborators', cube_id, user.uid].join('/')).once('value')
              .then(function(collab) {
                if(collab.val()){
                  ownerStat = { owner: true, walls: [parseInt(collab.val().wall)] };
                  
                  firebase.database().ref(['Cubes', collab.val().owner, cube_id].join('/')).once('value')
                  .then(function(owner) {
                    if(coll_owner.val()) {
                      updateBG = firebase.database().ref(['Cubes', collab.val().owner, cube_id].join('/'));
                      updateBG.update({
                        bgImg: img
                      }).then(function() {
                        $(vthis).parent('.bg-image-holder').parent('.bg-holder-selector').slideUp('fast');
                      });
                    }
                  });
                }
              });
            }
          });
        }


      });

      firebase.database().ref("CollaboReq/" + user.uid).on('value', function(snapshot){
        var requestees    = snapshot.val(),
            notif_wrap    = $('.notify-toggle-wrapper'),
            tot_notif     = parseInt($('.notify-toggle-wrapper').find('#tot-notif-count').html()),
            notif_widget  = $('#cmpltadminModal-7.collabreqs .notification-widget');
        if(requestees) {
          $.each(requestees, function(idx, val) {
            if(!hasChild('li[data-collab="' + idx + '"]')) {
              tot_notif+=1;
              notif_widget.append(addToRequests(idx, val));
              clickableRequest(notif_widget);
              showSuccess(val.name + " requested you as a collaborator.");
              $('.notify-toggle-wrapper').find('.tot-notif-count').html(tot_notif);
            }
          });
          $('.notify-toggle-wrapper').show();
          $('.notify-toggle-wrapper').find('.coll-requests').show();
        }
      });

      firebase.database().ref("CubeReq").on('value', function(snapshot){
        var cube_reqs    = snapshot.val(),
            notif_wrap    = $('.notify-toggle-wrapper'),
            tot_notif     = parseInt($('.notify-toggle-wrapper').find('#tot-notif-count').html()),
            notif_widget  = $('#cmpltadminModal-7.collabreqs .notification-widget'),
            tot_notif_wrap  = $('.notify-toggle-wrapper').find('.tot-notif-count');
        
        if(cube_reqs) {
          $.each(cube_reqs, function(cube, val) {
            if(cube == 'useridA') return;

            $.each(val, function(receiver, r_data) {
              if(receiver !== user.uid) return;

              $.each(r_data, function(sender, s_data) {
                if(sender == 'useridb') return;

                var contains_cube = !hasChild('li#' + sender + '[data-cube="' +  cube + '"]');
                if(contains_cube) {
                  tot_notif+=1;
                  notif_widget.append(addToCubeRequests(sender, s_data));
                  cubeclickableRequest(notif_widget);
                  showCustomSuccessMessage(
                    s_data.name + " added you as a collaborator of " + s_data.cubeName + ".",
                    'cube-req-collab'
                  );
                  tot_notif_wrap.html(tot_notif);

                  $('.notify-toggle-wrapper').show();
                  $('.notify-toggle-wrapper').find('.coll-requests').show();
                }
              });
            });
          });
        }
      });

      if(cube_id) {
        firebase.database().ref(["CubeReq", cube_id].join('/')).on('value', function(snapshot){
          var collabs     = snapshot.val(),
              cubecollabs = $('.wraplist.cube-collabs');

          if(collabs) {
            $.each(collabs, function(idx, content) {
              var owner_id = Object.keys(content)[0];
              var val = content[owner_id];

              var wraplist    = $('#collabs-holder .panel[data-wall="' + val.wall + '"]')
                                .find('.wraplist'),
                  is_owner    = user.uid === owner_id ? true : false,
                  link_btn    = '',
                  rem_btn     = '',
                  owner_class = '';

              firebase.database().ref(["Users", idx].join('/')).once('value')
              .then(function(collab) {
                var status =  collab.val().status, stat_indicator = 'badge-secondary';

                if( status === 'online' ) stat_indicator = 'badge-success';

                if(is_owner) {
                  rem_btn = '<i class="fa fa-remove remove-collab text-danger" data-user="' + idx + '"></i>';
                  owner_class = 'owned-cube';
                }

                link_btn  = '<a class="collab-list '+ owner_class +'" href="/accounts/profile/' + idx + '" data-user="' + idx + '">' +
                              '<span class="badge badge-md ' + stat_indicator + '"><span class="fa fa-envelope"></span></span> ' +
                              collab.val().firstname + ' ' + collab.val().lastname +
                            '</a>';
              
                if(!hasChild('#collabs-holder a[data-user="' + idx + '"]')) {
                  $(wraplist).prepend(
                    '<li>' + link_btn + rem_btn + '</li>'
                  );

                  removeCollab(idx, 'CubeReq');
                  userStatusListener(idx);
                }
              });
            });
          }
        });

        firebase.database().ref(["CubeCollaborators", cube_id].join('/')).on('value', function(snapshot){
          var collabs     = snapshot.val(),
              cubecollabs = $('.wraplist.cube-collabs');

          if(collabs) {
            $.each(collabs, function(idx, val) {

              var wraplist    = $('#collabs-holder .panel[data-wall="' + val.wall + '"]')
                                .find('.wraplist'),
                  is_owner    = user.uid === val.owner ? true : false,
                  link_btn    = '',
                  rem_btn     = '',
                  owner_class = '';

              firebase.database().ref(["Users", idx].join('/')).once('value').
              then(function(collab) {
                var status =  collab.val().status, stat_indicator = 'badge-secondary';

                if( status === 'online' ) stat_indicator = 'badge-success';

                if(is_owner) {
                  rem_btn = '<i class="fa fa-remove remove-collab text-danger" data-user="' + idx + '"></i>';
                  owner_class = 'owned-cube';
                }

                link_btn  = '<a class="collab-list '+ owner_class +'" href="/accounts/profile/' + idx + '" data-user="' + idx + '">' +
                              '<span class="badge badge-md ' + stat_indicator + '"><span class="fa fa-user"></span></span> ' +
                              val.name +
                            '</a>';
              
                if(!hasChild('#collabs-holder a[data-user="' + idx + '"]')) {
                  $(wraplist).prepend(
                    '<li>' + link_btn + rem_btn + '</li>'
                  );

                  removeCollab(idx, 'CubeCollaborators');
                  userStatusListener(idx);
                }
              });
            });
          }
        });
      }

      function userStatusListener(usr) {
        firebase.database().ref(["Users", usr].join('/')).on('value', function(snapshot) {
          var stat    = snapshot.val().status,
              collab  = $('.collab-list[data-user="'+ usr +'"]');

          if(stat === 'online')
            collab.find('span:first-child').removeClass('badge-secondary').addClass('badge-success');
          else
            collab.find('span:first-child').removeClass('badge-success').addClass('badge-secondary');
        });
      } 

      function removeCollab(usr, node) {
        $('i.remove-collab[data-user="' + usr + '"]').click(function() {
          var icon_rem = $(this);
          $( "#dialog_remove_collab" ).dialog({
            modal: true,
            buttons: {
              'OK': function () {
                var rem_ref = firebase.database().ref([node, cube_id, usr].join('/'))
                rem_ref.remove().then(function() {
                  icon_rem.parent().remove();
                  $('#dialog_remove_collab').dialog('close');
                });
              },
              'CANCEL': function () {$(this).dialog('close');}
            },
            open: function () {
              var btn_holder = $('[aria-describedby="dialog_remove_collab"]');
              btn_holder.find(".ui-dialog-buttonset")
                  .children("button:first-child") // the first button
                  .addClass("btn btn-default btn-sm");
              btn_holder.find(".ui-dialog-buttonset")
                  .children("button:last-child") // the first button
                  .addClass("btn btn-secondery btn-sm");
            }
          });
        });
      }

      firebase.database().ref("CollabAccepted/" + user.uid).on('value', function(snapshot){
        var accepts         = snapshot.val(),
            notif_list_wrap = $('.notify-toggle-wrapper').find('.list ul'),
            tot_notif       = parseInt($('.notify-toggle-wrapper').find('#tot-notif-count').html()),
            collab_cont     = $('.collaborators .wid-notification ul'),
            tot_notif_wrap  = $('.notify-toggle-wrapper').find('.tot-notif-count');
        if(accepts) {
          $.each(accepts, function(idx, val) {
            notif_list_wrap.append(collabHtml(idx,val));
            tot_notif++;
              if($('.dropdown-menu.notifications').has('li[data-user-id="' + idx + '"]').length < 1) {
                $('.notify-toggle-wrapper').find('.tot-notif-count').html(tot_notif);
                showSuccess(val.name + " has accepted your request.");
                collab_cont.append(collaboratorsHtml(idx, val));
              }
            tot_notif_wrap.html(tot_notif);
          });
          $('.notify-toggle-wrapper').show();
        }
      });

      firebase.database().ref("CubeAccepted").on('value', function(snapshot){
        var acceted_cubes = snapshot.val();

        if(acceted_cubes) {
          var accepts         = snapshot.val(),
            notif_list_wrap = $('.notify-toggle-wrapper').find('.list ul'),
            tot_notif       = parseInt($('.notify-toggle-wrapper').find('#tot-notif-count').html()),
            collab_cont     = $('.collaborators .wid-notification ul'),
            tot_notif_wrap  = $('.notify-toggle-wrapper').find('.tot-notif-count'),
            notif_drop      = $('.dropdown-menu.notifications');

          $.each(acceted_cubes, function(idx, cubes) {
            if(idx !== user.uid) return;

            // console.log(idx);
            // console.log(cubes);

            $.each(cubes, function(cube_idx, acceptees) {
              // console.log(cube_idx);
              // console.log(acceptees);

              console.log('-========-')
              $.each(acceptees, function(id, val) {
                // console.log(id);
                // console.log(val);
                tot_notif++;
                var exist_notif = notif_drop.has('li#' + id + '[data-cube-id="' + val.cube + '"]');
                if(exist_notif.length < 1) {
                  notif_list_wrap.append(collabHtml(id,val));
                  showSuccess(val.name + " has accepted your request as a collaborator of " + val.cubeName + ".");                  
                  tot_notif_wrap.html(tot_notif);
                  $('.notify-toggle-wrapper').show();
                }

                var usr_icon = $('#collabs-holder a[data-user="' + id + '"]').find('.badge')
                // console.log(usr_icon)
                usr_icon.children('.fa').removeClass('fa-envelope').addClass('fa-user');
              });
            });
          });
        }
      });

      $('#all-notifs').on('hidden.bs.dropdown', function () {
        var notif_list_wrap = $('.notify-toggle-wrapper').find('.list ul'),
            notif_wrap      = $('.notify-toggle-wrapper').find('.tot-notif-count'),
            accpt_reqs       = notif_list_wrap.children('.accepted-request').length;

        var tot_notif = parseInt(notif_wrap.html());

        if(accpt_reqs > 0) {
          notif_list_wrap.children('.accepted-request').each(function() {
            var accepted = $(this);

            if(accepted.attr('data-cube-id')) {
              var cube = accepted.attr('data-cube-id'),
                  id   = accepted.attr('id');

              firebase.database().ref(["CubeAccepted", user.uid, cube, id].join('/')).remove();
              $(this).remove();
            }
          });

        }

        tot_notif -= accpt_reqs;
        notif_wrap.html(tot_notif);
        if(tot_notif < 1)
          $('.notify-toggle-wrapper').hide();
        
      });

      $('#text-holder h4 i').click(function() {
        $('#text-holder').slideUp(100);
        $('#find-cubes').val('');
      });

      $('.find a').click(function(e) {
        e.preventDefault();
        var srchProj = $('.cube_search')
        // $('#text-holder').slideDown(100);
        if(srchProj.is(':visible')) {
          srchProj.slideUp(100);
          
        }
        else
          srchProj.slideDown(100);
          $('.categories.projects').slideUp('fast');
        $('#cube-detail-entry').slideUp('fast');
        $('#wall-collab-entry').slideUp('fast');
        $('#assign-question-entry').slideUp('fast');
      });

        $('.box-pro').click(function(){
          // while(hashPublish.length > 0){
          //   hashPublish.pop();
          // }
          $('.col-xs-2 a').remove();
          searchGenreCube($(this).attr('data-color'));
        });

      function searchGenreCube(color){
        var currUser = firebase.auth().currentUser;
        firebase.database().ref(["Cubes", currUser.uid].join('/')).once('value')
       .then(function(snap){
          var idPublish = [];
          var hashPublish = [];
          var liveCubes = [],
              lensedCubes = [],
              realCubes = [],
              publishCubes = [],
              sellCubes = [],
              foodCubes = [],
              customCubes = [];
          var user_cubes = snap.val();
          if(user_cubes) {
            $.each(user_cubes, function(idx, val){
              var cube_k = idx,
                  hue    = val.hue,
                  lightness = val.lightness,
                  saturation = val.saturation;
              if (hue == 0.83 && lightness == 0.5){
                liveCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});

              }
              else if (hue == 0.16 && lightness == 0.5){
                lensedCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else if (hue == 0.5 && lightness == 0.5){
                realCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else if (hue == 0.67 && lightness == 0.5){
                publishCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else if (hue == 0 && lightness == 0.5 && saturation == 1){
                sellCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else if (hue == 0.33 && lightness == 0.25){
                foodCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else if (hue == 0 && lightness == 0.5 && saturation == 0){
                customCubes.push({value: val.name, key: {cube: idx, user: currUser.uid, name: val.name}});
              }
              else {}
            });
          }
          switch(color){
            case "0":
              $.each(liveCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });            
              var itr = 0;
              $.each(liveCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;
            case "1":
              $.each(lensedCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
              var itr = 0;
              $.each(lensedCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;
            case "2":
              $.each(foodCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
             var itr = 0;
              $.each(foodCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
             break;
            case "3":
              $.each(realCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
              var itr = 0;
              $.each(realCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;
            case "4":
              $.each(sellCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
              var itr = 0;
              $.each(sellCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;
            case "5":
              $.each(publishCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
              var itr = 0;
              $.each(publishCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;
            case "6":
              $.each(customCubes, function(idx, val){
                idPublish.push(val.key.cube);
              });
              $.each(idPublish, function(id, value){
                firebase.database().ref('HashTags').once('value', function(snap) {
                  $.each(snap.val(), function(cub, valu) {
                    $.each(valu, function(c, values) {
                      if(c == value)
                      {
                        hashPublish.push({value: cub, key: {cube: c, user: values.user_id, name: values.cube_name, genre: values.genre}});
                      }
                    });
                  });
                });      
              });
              var itr = 0;
              $.each(customCubes, function(idx, val){
                // $('col-xs-12 cube_hold').append(
                //  '<div class="col-xs-2" id ="src-cube-'+itr+'">'+
                //    '<div class="staff-photo box-pro">'+
                //     '</div>'+
                //   '</div>'
                // )
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
              break;       
          }
          var obj = {};
          for ( var i=0, len=hashPublish.length; i < len; i++ )
            obj[hashPublish[i]['value']] = hashPublish[i];

          hashPublish = new Array();
          for ( var key in obj )
            hashPublish.push(obj[key]);

          $("#usr").typeahead("destroy");
          $('#usr').typeahead({
              hint: true,
              highlight: true,
              minLength: 1
          }, {
              name: 'sharedcubes',
              displayKey: 'value',
              source: substringMatcher(hashPublish)
          }).bind('typeahead:selected', function(ev, suggestion) {
            // console.log(suggestion);
            var searchCubes = [];
            var genre_type = suggestion.key.genre;
            var tag = suggestion.value;
            $('.col-xs-2 a').remove();
            firebase.database().ref(['HashTags', tag].join('/')).once('value', function(snap) {
              $.each(snap.val(), function(cub, val) {
               if (val.genre == genre_type && val.user_id == suggestion.key.user){
                 searchCubes.push({value: val.cube_name, key: {cube: cub, user: val.user_id, name: val.cube_name}});
                }
              });
            }).then(function(){
              var itr = 0;
              $.each(searchCubes, function(idx, val){
                var cubediv = document.getElementById('src-cube-'+itr+'');
                var aTag = document.createElement('a');
                aTag.setAttribute('href',"/accounts/cubes/"+val.key.cube);
                aTag.innerHTML = val.key.name.toUpperCase();
                cubediv.appendChild(aTag)
                itr++;
              });
            });
          }).blur(function() {
            if(hasChild('input#usr')) $(this).val('');
          });
        });
      }
      // cubesResult = [];
      // firebase.database().ref("SharedCubes").on('value', function(snapshot) {
      //   $.each(snapshot.val(), function(key, val) {
      //     if(key !== "cubeID")
      //       cubesResult.push({value: val.name, key: {cube: key, user: val.userId}});
      //   });
      // });

      // firebase.database().ref("HashTags").on('value', function(snapshot) {
      //   $.each(snapshot.val(),function(key, val) {
      //     key = "#".concat(key)
      //     cubesResult.push({value: key, key: {cube: val.cube_id, user: val.user_id}})
      //   });
      // });

      // var user = firebase.auth().currentUser;
      // firebase.database().ref("Cubes/"+ user.uid).on('value', function(snapshot) {
      //   $.each(snapshot.val(),function(key, val) {
      //     cubesResult.push({value: val.name, key: {cube: key, user: user.uid}})
      //   });
      // });


      if($('#interior_cube').is(':visible')) {
        firebase.database().ref(["CubeCollaborators", cube_id, user.uid].join('/')).once('value').then(function(cubeCollab) {
          var cube_collab = cubeCollab.val();
          if(!cube_collab) {
            firebase.database().ref(["Cubes", user.uid, cube_id].join('/')).once('value').then(function(snapshot) {
              if(!snapshot.val()) {
                firebase.database().ref(["CubeReq", cube_id, user.uid ].join('/')).once('value').then(function(req_snap) {
                  if(!req_snap.val()) {
                    reqe = user.email.replace(/(@|\.)/gms, "_")
                    firebase.database().ref(["CubeReq", cube_id, reqe ].join('/')).once('value').then(function(reqe_snap) {
                      if(!reqe_snap.val()) {
                        $('.panel-group a.add-new-link').remove();
                        if(window.location.pathname.indexOf('/accounts/profile') == -1 && window.location.pathname.indexOf('/accounts/cubes') >= 0){
                          var pathname = window.location.pathname.split('/');

                          if(pathname[pathname.length-1] != 'cubes') {
                            msg = "No enough permission to access the cube."
                            sessionStorage.setItem("not_collaborator", msg);
                            window.location.href = window.location.origin + '/accounts/cubes';
                          }
                        }
                      } else {
                        $.each(req_snap.val(), function( index, value ) {
                          autoAcceptCubeCollabWall(['CubeReq', cube_id, reqe, index].join('/'), user, index, cube_id)
                        });
                      }
                    });

                  } else {
                    $.each(req_snap.val(), function( index, value ) {
                      autoAcceptCubeCollabWall(['CubeReq', cube_id, user.uid, index].join('/'), user, index, cube_id)
                    });
                  }
                });
              } else {
                setSidebarDetails(snapshot.val());
              }
            });
          } else {
            firebase.database().ref(["Cubes", cube_collab.owner, cube_id].join('/'))
            .once('value').then(function(snapshot) {
              setSidebarDetails(snapshot.val());
            });

            setCubeCollabWall(cube_collab.wall, cube_collab.owner)
          }

          $('.fa-edit[data-edit-wall]').show();
        });
      }
    }
  });


  function autoAcceptCubeCollabWall(req_ref, user, index, cube_id) {
    var acceptee  = getUserInfo(user.uid);

    Promise.all([acceptee]).then(function(res) {
      firebase.database().ref(req_ref).once('value')
      .then(function(snapshot) {
          var result      = snapshot.val(),
              cubeCollab  = firebase.database().ref([
                            'CubeCollaborators', result.cube, user.uid
                          ].join('/'));
              
          cubeCollab.set({
            name: [res[0].firstname, res[0].lastname].join(' '),
            image: res[0].image ? res[0].image : '',
            wall: result.wall,
            owner: index,
            position: ''
          });

          setCubeCollabWall(result.wall, index)

          firebase.database().ref(['CubeReq', currCube, currUser.uid].join('/')).remove()
      });
    });

    firebase.database().ref(req_ref).once('value').then(function(dcube) {
      setSidebarDetails(dcube.val());
    })
  }


  function setCubeCollabWall(skip_rem, owner) {
    var remove_links = [], remove_edits = [];

    $('.wall-link[data-wall="' + skip_rem + '"]').append(
        '<span class="badge badge-purple">Collaborator</span>'
    );

    for( var ctr=0; ctr<=5; ctr++ ) {
      if( ctr === skip_rem ) {
        $('.fa-edit[data-edit-wall="' + ctr + '"]').attr('data-cube', owner);
        continue;
      }

      remove_links.push('.panel-group a.add-new-link[data-wall="' + ctr + '"]');
      remove_edits.push('.panel-group .panel .fa-edit[data-edit-wall="' + ctr + '"]')
    }

    // $(remove_links.join(', ')).remove();
    // $(remove_edits.join(', ')).remove();
    $('.add-collab').remove();
  }


  function setSidebarDetails(cube_obj) {
    $('.box.inverted .cube-name.title').text(cube_obj.name);
    $.each(cube_obj.wallNames, function(name_id, name) {
      var wall_name_sel = 'a.wall-link[data-wall="' + name_id + '"]';
          wall_name_sel += ', a.collab-link[data-wall="' + name_id + '"]';

      $(wall_name_sel).find('span.wall-name').text(name);
      if (name != undefined)
        $(wall_name_sel).find('span.demo-box').css("display", "inline");
    });
  }

  resizeSections();
  var allowClose = true;


  $(window).resize(function() {
    resizeSections();
  });

  $(window).on('scroll', function() {
    notifierVisibility(null);
  })

  setTimeout(function() {
    if(hasChild('#pin3d-desc'))
      $('#pin3d-desc').get(0).pause();
  }, 950);

  $(window).scroll(function() {
    parallax();
    parallaxSlow();
    parallaxMid();
    parallaxInverse();
  });


  if(hasChild('.favorite-cubes')) {
    $('.favorite-cubes').perfectScrollbar({
      suppressScrollY: true,
      default: ['click-rail', 'drag-thumb', 'keyboard', 'wheel', 'touch']
    });
  }


  $('section').click(function() {
    if($('figure.cube').hasClass('unfold') && allowClose) {
      var fCube = $('figure.cube');
      fCube.removeClass('unfold');
      fCube.parent('.container-cube').height(165);
      fCube.css('margin-left', 'auto');
    }
  });

  $('figure.cube').click(function() {
    if(!$(this).hasClass('unfold') && !$(this).hasClass('spin')) {
      // $(this).addClass('spin');
      setTimeout(function() {
        $('figure.cube').addClass('unfold');
        var containerCube = $('figure.cube').parent('.container-cube').width();
        // console.log(containerCube);
        $('figure.cube').css('margin-left', ((containerCube/2)-80 )+ 'px');
        $('figure.cube').parent('.container-cube').height(250);
      }, 10);
    }
  });

  if ($.isFunction($.fn.select2)) {

    $("#country").select2({
        placeholder: 'Country',
        allowClear: true
    }).on('select2-open', function() {
        $(this).data('select2').results.addClass('overflow-hidden').perfectScrollbar();
    });
  }

  $('#theme').bind('click', function(e) {
    e.preventDefault();
    var selectorBG = $('.bg-holder-selector');
    if(selectorBG.is(':visible'))
      selectorBG.slideUp('fast');
    else
      selectorBG.show();
  });

  $("#country").change(function() {
    var country = $(this).val();
    if( country ) {
      $.ajax({
        url: "/accounts/get_country_code" ,
        data: {country: country}
      }).done(function(result) {
        var pMask = "";
        $.each(result.country_code.split(''), function(idx, val) {
          if(parseInt(val) === 9)
            pMask += "\\" + val;
          else
            pMask += val;
        });
        $('#phone').inputmask("+(" + pMask + ") 999 999 999");
      });
    }
  });

  $('#signup.register').click(function(e) {
    e.preventDefault();
    var s2Elem = $(this).children('a').attr('href');
    $('html, body').animate({scrollTop: $(s2Elem).offset().top - 60}, 500);
  });

  $(document).on('click', '.coll-request-span', function(e) {
    var _this     = $(this),
        col_req   = _this.closest('.coll-request'),
        currUser  = firebase.auth().currentUser;
    firebase.database().ref(["CollabAccepted", currUser.uid, col_req.data('user-id')].join('/'))
    .remove().then(function() {
      window.location.href = window.location.origin + _this.attr('href')
    });
  })

  function addToRequests(idx, val) {
    var img = val.image ? val.image : '/assets/default-profile.png';
    return '<li class="status-offline" id="' + idx + ' data-collab="' + idx + '">' +
      '<a href="javascript:;">' +
        '<div class="user-img">' +
          '<img class="img-circle img-inline" src="' + img + '">' +
        '</div>' +
        '<div>' +
          '<span class="name">' +
            '<strong>' + val.name + '</strong>' +
            '<button class="pull-right btn btn-info" data-idx="' + idx + '">Accept</button>' +
          '</span>' +
        '</div>' +
      '</a>'+
    '</li>';
  }

  function addToCubeRequests(idx, val) {
    return '<li class="status-offline" id="' + idx + '" data-cube="' + val.cube + '">' +
      '<a href="javascript:;">' +
        '<div class="user-img">' +
          '<i class="fa fa-cube"></i>' +
        '</div>' +
        '<div>' +
          '<span class="name">' +
            '<strong> You are added as a collaborator of ' + val.cubeName + '</strong>' +
            '<button class="pull-right btn btn-info" data-idx="' + idx + '" data-cube-idx="' + val.cube + '">OK</button>' +
          '</span>' +
        '</div>' +
      '</a>'+
    '</li>';
  }

  function collabHtml(idx, val) {
    // console.log(idx);
    var img = val.image ? val.image : '/assets/default-profile.png';
    if(val.cubeName) {
      return '<li class="available accepted-request" id="' + idx +'" data-cube-id="' + val.cube +'">' +
        '<a href="/accounts/cubes/' + val.cube + '">' +
          '<div class="user-img">' +
            '<i class="fa fa-cube"></i>' +
          '</div>' +
          '<div>' +
          '<span class="name">' +
            '<strong>' + val.name + '</strong>' +
            '<span class="time small">Accepted as ' + 
              '<strong>' + val.cubeName + '</strong>' +
            ' collaborator</span>' +
          '</span>' +
          '</div>' +
        '</a>' +
      '</li>';
    } else {
      return '<li class="available coll-request" id="' + idx +'" data-user-id="' + idx +'">' +
        '<span class="coll-request-span" href="/accounts/profile/' + idx + '" style="cursor:pointer;">' +
          '<div class="user-img">' +
            '<img alt="user-image" class="img-circle img-inline" src="' + img + '">' +
          '</div>' +
          '<div>' +
          '<span class="name">' +
            '<strong>' + val.name + '</strong>' +
            '<span class="time small">Accepted your request</span>' +
          '</span>' +
          '</div>' +
        '</a>' +
      '</li>';
    }
  }

  function collaboratorsHtml(idx, val) {
    var img = val.image ? val.image : '/assets/default-profile.png';
    return '<li>' +
      '<a href="/accounts/profile/'+ idx + '" id="' + idx +'">' +
        '<div class="user-img">' +
          '<img alt="user-image" class="img-circle img-inline" src="' + img + '">' +
        '</div>' +
        '<div class="name-container">' +
          '<span class="name">' +
          '<strong>' + val.name + '</strong>' +
          '</span>' +
        '</div>' +
      '</a>' +
    '</li>';
  }


  function clickableRequest(elem) {
    elem.children('li:last-child').find('button').click(function() {
      var uid             = $(this).attr('data-idx'),
          currUser        = firebase.auth().currentUser,
          tot_notif_wrap  = $('.notify-toggle-wrapper').find('.tot-notif-count'),
          collab_cont     = $('.collaborators .wid-notification ul');

      var userA     = getUserInfo(uid),
          userB     = getUserInfo(currUser.uid),
          tot_notif = parseInt(tot_notif_wrap.html());

      Promise.all([userA, userB]).then(function(res) {
        var collabA = firebase.database().ref([
                        'Collaborations', res[0].userId, res[1].userId
                      ].join('/'));
        collabA.set({
          name: [res[1].firstname, res[1].lastname].join(' '),
          image: res[1].image ? res[1].image : ''
        });

        var collabB = firebase.database().ref([
                        'Collaborations', res[1].userId, res[0].userId
                      ].join('/'));
        collabB.set({
          name: [res[0].firstname, res[0].lastname].join(' '),
          image: res[0].image ? res[0].image : ''
        });
        
        showSuccess(
          [res[0].firstname, res[0].lastname].join(' ') +
          ' was added to your collaborators.'
        );

        var collabAccept = firebase.database().ref([
                        'CollabAccepted', res[0].userId, res[1].userId
                      ].join('/'));
        collabAccept.set({
          name: [res[1].firstname, res[1].lastname].join(' '),
          image: res[1].image ? res[1].image : ''
        });

        firebase.database().ref(["CollaboReq",res[1].userId,res[0].userId].join('/'))
                .remove();

        tot_notif -= 1;
        tot_notif_wrap.html(tot_notif);
        if(tot_notif < 1) {
          $('#cmpltadminModal-7.collabreqs').modal('hide');
          $('.notify-toggle-wrapper').hide();
        }

        var sel_request = elem.children('li[data-collab="' + idx + '"]');
            val = {
              name:   sel_request.find('.name strong').html(),
              image:  sel_request.find('.user-img img').attr('src')
            };

        collab_cont.append(collaboratorsHtml(uid, val));
        sel_request.remove();
      });
    });
  }

  function cubeclickableRequest(elem) {
    elem.children('li:last-child').find('button').click(function() {
      $(this).attr('disabled', 'disabled');
      var uid             = $(this).attr('data-idx'),
          currCube        = $(this).attr('data-cube-idx'),
          currUser        = firebase.auth().currentUser,
          tot_notif_wrap  = $('.notify-toggle-wrapper').find('.tot-notif-count'),
          collab_cont     = $('.collaborators .wid-notification ul');

      var acceptee  = getUserInfo(currUser.uid),
          tot_notif = parseInt(tot_notif_wrap.html());

      Promise.all([acceptee]).then(function(res) {

        // firebase.database().ref(['CubeReq', currCube, currUser.uid, uid].join('/')).once('value')
        // .then(function(snapshot) {
        //   var result      = snapshot.val(),
        //       cubeCollab  = firebase.database().ref([
        //                     'CubeCollaborators', result.cube, currUser.uid
        //                   ].join('/'));
        //   cubeCollab.set({
        //     name: [res[0].firstname, res[0].lastname].join(' '),
        //     image: res[0].image ? res[0].image : '',
        //     wall: result.wall,
        //     owner: uid,
        //     position: ''
        //   });

        //   $('.messenger-close').trigger('click');

        //   showSuccess(
        //     'You are now a collaborator of ' + result.cubeName + '.'
        //   );

        //   var cubeAccepted = firebase.database().ref([
        //         'CubeAccepted', uid, currCube
        //       ].join('/'));

        //   cubeAccepted.update({
        //     [currUser.uid]: {
        //       name: [res[0].firstname, res[0].lastname].join(' '),
        //       image: res[0].image ? res[0].image : '',
        //       cubeName: result.cubeName,
        //       cube: currCube
        //     }
        //   });
        // });

        tot_notif -= 1;
        tot_notif_wrap.html(tot_notif);
        if(tot_notif < 1) {
          $('#cmpltadminModal-7.collabreqs').modal('hide');
          $('.notify-toggle-wrapper').hide();
        }

        if(!window.location.pathname.includes(currCube))
          window.location.href = window.location.origin + '/accounts/cubes/' + currCube;

        elem.children('li#' + uid + '[data-cube="' + currCube + '"]').remove();
      });
    });
  }

  function parallax() {
    var vScroll = $(window).scrollTop();
    $('.parallax').css('background-position', 'center ' + ((vScroll * 0.2)) + 'px');
  }

  function parallaxSlow() {
    var vScroll = $(window).scrollTop();
    $('.parallax-slow').css('background-position', 'center ' + ((vScroll * 0.2)) + 'px');
  }

  function parallaxInverse() {
    var vScroll = $(window).scrollTop();
    $('.parallax-inverse').css('background-position', 'center ' + ((vScroll * 0.3)) + 'px');
  }

  function parallaxMid() {
    var vScroll = $(window).scrollTop();
    $('.parallax-mid').css('background-position', 'center ' + ((vScroll * 0.2)) + 'px');
  }

  function resizeSections() {
    // $('.section-1').height(1536);
    $('.section-2').height($('.section-2').children('.col-sm-8').height());
    if($('figure.cube').hasClass('unfold')) {
      var containerCube = $('figure.cube').parent('.container-cube').width();
      $('figure.cube').css('margin-left', ((containerCube/2)-80 )+ 'px');
    }

    if(hasChild('.categories')) {
      var xs4Child =  $('.categories .col-xs-8 .col-xs-4'),
          xs4Parent = $('.categories .col-xs-4.blank');

      if(xs4Child.is(':visible'))
        xs4Child.height(xs4Child.width());
      else
        xs4Child.height(Math.round(xs4Child.width() * 2) - 5);

      xs4Parent.height(xs4Child.height() * 2 + 15);
    }

    if(hasChild('.favorite-cubes')) {
      var fav_cubes = $('.favorite-cubes'),
          tot_cubes = fav_cubes.find('.cube-inline').length,
          wid_cubes = fav_cubes.find('.cube-inline').width();

      // console.log(tot_cubes * (wid_cubes + 15) + 16);
      
      fav_cubes.children('.cubes-holder').width(tot_cubes * (wid_cubes + 15) + 20);
    }
  }

  function initUserMethods(user) {

    if($(".login_page").length){
      if($(".string, .email, .password").hasClass("input")){
        $(".string, .email, .password").removeClass("input");
      }
    }

    var collabsUid, uProf = getProfileID(),
        btnAcctions = $('.collaborators .actions');
    if(uProf == 'profile')
      collabsUid = user.uid;
    else {
      collabsUid = uProf;
      btnAcctions.detach();
    }

    firebase.database().ref("Collaborations/" + collabsUid).once('value')
    .then(function(snapshot){
      var collabs     = snapshot.val(),
          collab_cont = $('.collaborators .wid-notification ul');

      collab_cont.html('');

      if(collabs) {
        $.each(collabs, function(idx, val) {
          collab_cont.append(collaboratorsHtml(idx, val));
        });
      }
    });
  }


  function showProfile() {
    $("#main-content").removeClass("show-profile");
    var id              = getProfileID(),
        prof_name_cont  = $('.main-profile .uprofile-name'),
        currUser;
        
    if(id == 'profile') {
      currUser = firebase.auth().currentUser;
    } else {
      if(id == firebase.auth().currentUser.uid)
        window.location.href = window.location.origin + '/accounts/profile';
      else
        prof_name_cont.find('a.btn').remove();
      currUser = {uid: id};
    }

    firebase.database().ref(["Users", currUser.uid].join('/')).once('value')
    .then(function(snap){
      var profile = snap.val();
      $('.show-name').text([
        profile.firstname,
        profile.lastname
      ].join(' ').toUpperCase());
      $('.show-occupation').text(preFilledKey(profile.occupation));
      // console.log(profile['age-group']);
      $('.show-email').text(preFilledKey(currUser.email));
      $('.show-country').text(preFilledKey(profile.country));
      $('.show-phone').text(preFilledKey(profile.phone));
      $('.show-address').text(preFilledKey(profile.address));
      $('.show-age-group').text(preFilledKey(profile['age-group']));
      $('.show-favorite-color').text(preFilledKey(profile['favorite-color']));
      $('.show-genre').text(preFilledKey(preFilledKey(profile['favorite-genre'])));
      $('.show-gamer-tag').text(preFilledKey(preFilledKey(profile['gamer-tag'])));
      $('.show-identity').text(preFilledKey(preFilledKey(profile.identity)));
      $('.show-bio').text(preFilledKey(preFilledKey(profile.bio)));

      if(id == 'profile')
        $('.uprofile-image img').attr('src', preFilledImg(currUser.photoURL));
      else {
        $('.uprofile-image img').attr('src', preFilledImg(profile.image));
      }
    }).catch(function(error){
      console.log(error);
    });

    firebase.database().ref([
      "Questions", "UserQuestions", currUser.uid
    ].join('/')).once('value').then(function(snap) {
      var user_questions  = snap.val() ? snap.val() : [],
          q_holder        = $('#questions-holder'),
          itr             = 0;
      if (user_questions.constructor == Array)
        {
          user_questions = user_questions.filter(Boolean);
        }
      if(user_questions) {
        $.each(user_questions, function(idx, val) {
          var question_k  = idx,
              choice_k    = val.choice;
  
          firebase.database().ref([
            "Questions", "ProfileQuestion", question_k
          ].join('/')).once('value').then(function(snap){
            if(snap.val()) {
              var panel = q_holder.find('#panel-' + itr);
              panel.find('.panel-title a').text(snap.val().title);
              panel.find('.panel-collapse .panel-body').html('<blockquote class="purple background">' +
                '<small>' + snap.val().choices[choice_k].choiceText + '.</small>' +
              '</blockquote>');
              itr++;            
            }
          });
        });
      }

    });

    firebase.database().ref(["Cubes", currUser.uid].join('/')).once('value')
    .then(function(snap){
      var user_cubes = snap.val(),
          c_holder   = $('.cubes-holder'),
          itr   = 0;
      if(user_cubes) {
        $.each(user_cubes, function(idx, val){
          var cube_k = idx,
              favorite = val.favorite;
              cube_name = val.name;
              try {
                name = firebase.auth().currentUser.displayName.toUpperCase();
              }
              catch(e) {}

          if(favorite){
            c_holder.append(
             '<div class="cube-inline" id ="fav-cube-'+itr+'">'+
              // '<div id="cube-collab-indicator" style="">' +
               //  '<div class="indicator-holder">' +
               //    '<div class="title">' +
               //      '<span>asdf</span>' +
               //    '</div>' +
               //    '<div class="description">asdf</div>' +
               //    '<i class="fa fa-caret-down fav-cube"></i>' +
               //  '</div>' +
               // '</div>' +
               '<div class="container-cube">'+
                 '<div class="favorite-cube">'+
                   '<div class="fav-cube-name">'+
                   '<div class="cube-owner-name">'+
                   '</div>'+
                  '</div>'+
                '</div>'+
              '</div>'
              )
            var container = c_holder.find('#fav-cube-'+ itr);
            var cubediv = document.getElementsByClassName('fav-cube-name')[itr];
            var aTag = document.createElement('a');
            aTag.setAttribute('href',"/accounts/cubes/"+cube_k);
            aTag.setAttribute('title', val.description);
            aTag.innerHTML = cube_name.toUpperCase();
            cubediv.appendChild(aTag)
            $(".cube-owner-name").text(name);
            itr++;

            $(container).mousemove(function(event) {
              event.cubeName = val.name;
              event.cubeDesc = val.description ? val.description : 'No description set.';
              event.clientBounding = container[0].getBoundingClientRect();
              notifierVisibility(event);
            }).mouseout(function() {
              notifierVisibility(null);
            });
          }
        });
      }
    });
  }


    // $(document).on('mouseover', '.fav-cube-name', function(event){
    //   $( '.fav-cube-name' ).tooltip({
    //   position: {
    //     my: "center bottom-20",
    //     at: "center top",
    //     using: function( position, feedback ) {
    //       $( this ).css( position );
    //       $( "<div>" )
    //         .addClass( "arrow" )
    //         .addClass( feedback.vertical )
    //         .addClass( feedback.horizontal )
    //         .appendTo( this );
    //     }
    //   }
    // });
    // });


  function getProfileID() {
    var path = window.location.pathname.split('/');
    return path[path.length-1];
  }


  function initEditUserMethods(user) {
    $('#upload_image').click(function() {
      $("input#image").trigger('click');
    });

    $('input#image').on('change', function() {
      if(this.files && this.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
          $('#upload_image').find('.image').attr('style', 'background-image: url(' + e.currentTarget.result + ');');
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

    $('#edit_user input[type="submit"]').click(function() {
      if(!$('#edit_user')[0].checkValidity()) {
        $('html, body').animate({scrollTop: $('#main-content').offset().top}, 10);
      }
    });

    $("#edit_user").submit(function(e) {
      e.preventDefault();
      var currUser    = firebase.auth().currentUser,
          storage     = firebase.storage(),
          storageRef  = storage.ref().child(['profileImages', currUser.uid].join('/')),
          img         = $(this).find("input#image").get(0);

      if(img.files && img.files[0]) {
        storageRef.put(img.files[0]).then(function(snapshot) {
          currUser.updateProfile({photoURL: snapshot.metadata.downloadURLs[0]})
          .then(function() {
            updateClientProfile($("#edit_user"), currUser.uid, snapshot.metadata.downloadURLs[0]);
          });
        });
      } else {
        updateClientProfile($(this), currUser.uid, null);
      }
    });
    
  
    if(hasChild('input#questions')) {
      var questions       = [],
          questionsField  = $('input#questions'),
          choicesCont     = $('.select-questions .choices'),
          anwser_btn      = $('.answer-buttons'),
          sel_questions   = $('.selected-questions');
      firebase.database().ref(["Questions", "ProfileQuestion"].join('/')).once('value')
      .then(function(snap){
        $.each(snap.val(), function(key, val) {
          questions.push({value: val.title, key: key});
        });

        questions.sort(function(a,b) {
          var nameA = a.value.toLowerCase(); // ignore upper and lowercase
          var nameB = b.value.toLowerCase(); // ignore upper and lowercase
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });

        questionsField.typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        }, {
            name: 'questions',
            displayKey: 'value',
            source: substringMatcher(questions)
        }).bind('typeahead:selected', function(ev, suggestion) {
          firebase.database().ref([
            "Questions", "UserQuestions", user.uid, suggestion.key].join('/'))
          .once('value').then(function(snap){
            
            if($('.selected-question[data-choice-id]').length >= 6) {
             showErrorMessage("Max questions of 6 was reached."); 
             return  false;
            }

            if(snap.val()) {
              showErrorMessage("Question already added.");
              questionsField.typeahead('val', '');
            } else {
              firebase.database().ref([
                "Questions", "ProfileQuestion", suggestion.key, 'choices'
              ].join('/')).once('value').then(function(snap){
                  choicesCont.html('');
                  $('.answer-buttons').hide();
                  $.each(snap.val(), function(key, val) {
                    choicesCont.append(
                      '<input class="skin-square-aero" name="choice" type="radio" value="' + key + '" data-question-key="' + suggestion.key + '">' +
                      '<label class="iradio-label form-label">' + val.choiceText  + '</label>'
                    );
                  });

                  $('.choices input[type="radio"').iCheck({
                    radioClass: 'iradio_square-aero'
                  });

                  $('.answer-buttons').show();
              });
            }
            $("body, html").animate({
              scrollTop: $("#questions-holder").offset().top - 70
            });
          });
        }).on('input', function() {
          if($(this).val() == "") {
            $(this).val('');
            choicesCont.html('');
            anwser_btn.hide();
          }
        });
      });


      anwser_btn.find('a:first-child').click(function(e) {
        if($('.selected-question[data-choice-id]').length >= 6) {
         showErrorMessage("Max questions of 6 was reached."); 
         return  false;
        }
        var checked = choicesCont.find('.iradio_square-aero.checked'),
            choice  = checked.find('input'),
            cLabel  = checked.next();
        if(choice.val() == undefined) {
          alert('Please select an answer.');
        } else {
          var question_k = choice.attr('data-question-key'),
              btn_text   = $(this).text();
          firebase.database().ref([
            "Questions", "UserQuestions", user.uid, question_k
          ].join('/')).set({choice: choice.val()}).then(function() {
            var data_question = 'data-question-id="' + question_k + '"',
                the_selected = $('.selected-question[' + data_question + ']');

            if(btn_text == "Add") {
              var appndStr = selectedQuestion({
                    question_id: question_k ,
                    question: questionsField.val(),
                    choice_id: choice.val(),
                    choice: cLabel.text()
                  }, false),
                  afterElem = sel_questions.children('.selected-question').filter(function(elem) {
                    var question_id = $(this).attr('data-question-id');
                    return parseInt(question_id) > parseInt(question_k)
                  })[0];
              afterElem = $(afterElem);

              if(afterElem.attr('data-question-id'))
                $(appndStr).insertBefore(afterElem);
              else
                sel_questions.append(appndStr);
            
              btnSelectedQuestions(data_question);
            } else {
              the_selected.find('.content-body small')
                .text(cLabel.text());
                the_selected.find('.panel_actions').find('.fa-trash').attr('data-question-id', question_k).removeAttr('style');
                the_selected.attr('data-choice-id', choice.val());
            }
            
            anwser_btn.find('a:last-child').trigger('click');

            var data_q_k      = 'section.selected-question[' + data_question + ']',
                scrollTo      = $('#questions-holder').offset().top + 140,
                nth_selected  = $('.selected-questions section').index($(data_q_k)),
                the_selected  = $(data_q_k);

            the_selected.css('border', '3px solid #72bef3');
            setTimeout(function() {
              the_selected.css('border', '3px solid #23394B');
            }, 4000);

            $("body, html").animate({
              scrollTop: scrollTo + (115 * nth_selected)
            }, {
              duration: 400,
              progress: function() {
                if(btn_text == "Add")
                  $('.selected-question[' + data_question + ']').slideDown('slow');
              }
            });
          });
        }
      });

      anwser_btn.find('a:last-child').click(function(e) {
        e.preventDefault();
        questionsField.val('');
        choicesCont.html('');
        anwser_btn.hide();
        $(this).prev().text('Add');
        questionsField.removeAttr('disabled');
      });
    }
  }

  function selectedQuestion(data, shown) {
    var question_id = 'data-question-id="' + data.question_id + '"',
        choice_id   = data.choice_id ? 'data-choice-id="' + data.choice_id + '"' : ''
        display     = shown ? '' : 'style="display:none;"',
        show        = data.choice_id ? question_id : 'style="display:none;"';
      
    return '<section class="box selected-question" ' + display + ' ' + [question_id, choice_id].join(' ') + '>' +
      '<header class="panel_header">' +
        '<h5 class="title pull-left">' + data.question + '</h5>' +
      '<div class="actions panel_actions pull-right">' +
        '<a class="fa fa-edit" ' + question_id + '></a>' +
        '<a class="fa fa-trash" ' + show + '></a>' +
      '</div>' +
      '</header>' +
      '<div class="content-body">' +
        '<blockquote class="purple">' +
          '<small>' + data.choice + '</small>' +
        '</blockquote>' +
      '</div>' +
    '</section>';
  }

  function btnSelectedQuestions(attrib) {
    $('a.fa-edit[' + attrib + ']').click(function() {
      var question_id = $(this).attr('data-question-id'),
          currUser    = firebase.auth().currentUser,
          choicesCont     = $('.select-questions .choices'),
          questionsField  = $('input#questions'),
          ans_button      = $('.answer-buttons');
      firebase.database().ref([
        "Questions", "ProfileQuestion", question_id
      ].join('/')).once('value').then(function(snap){
        // console.log(suggestion.key);
          choicesCont.html('');
          $('.answer-buttons').hide();
          $.each(snap.val().choices, function(key, val) {
            // questions.push({value: val.title, key: key});
            choicesCont.append(
              '<input class="skin-square-aero" name="choice" type="radio" value="' + key + '" data-question-key="' + question_id + '">' +
              '<label class="iradio-label form-label">' + val.choiceText  + '</label>'
            );
          });

          $('.choices input[type="radio"').iCheck({
            radioClass: 'iradio_square-aero'
          });

          questionsField.typeahead('val', snap.val().title);
          questionsField.attr('disabled', true);

          ans_button.children('a:first-child').text('Update');
          ans_button.show();

          $("body, html").animate({
            scrollTop: $("#questions-holder").offset().top - 70
          });
      });
    });
    $(document).on('click', 'a.fa-trash[' + attrib + ']', function(){
      var this_btn    = $(this),
          question_id = $(this_btn).attr('data-question-id'),
          currUser    = firebase.auth().currentUser;

      firebase.database().ref([
        "Questions", "UserQuestions", currUser.uid, question_id
      ].join('/')).remove().then(function(snap) {
        this_btn.parents('.selected-question').slideUp('fast', function() {
          $(this).remove();
        });
      });
    });
  }

  function updateClientProfile(elem, node, img_url) {

    var updateUser      = firebase.database().ref(["Users", node].join('/'));
    var profile_image   = null 
    if (!img_url) { 
      currUser = firebase.auth().currentUser;
      firebase.database().ref(["Users", currUser.uid].join('/')).once('value').then(function(snap){
        var profile = snap.val();
        profile_image = profile.image
      });
    }  
        firstname       = elem.find("#first_name").val(),
        lastname        = elem.find("#last_name").val(),
        occupation      = elem.find("#occupation").val(),
        country         = elem.find("#country").val(),
        phone           = elem.find("#phone").val(),
        address         = elem.find("#address").val(),
        age_group       = elem.find("#age_group").val(),
        favorite_color  = elem.find("#favorite_color").val(),
        favorite_genre  = elem.find("#favorite_genre").val(),
        gamer_tag       = elem.find("#gamer_tag").val(),
        bio             = elem.find("#bio").val();
    updateUser.update({
      firstname         : firstname ? firstname : "",
      lastname          : lastname ? lastname : "",
      occupation        : occupation ? occupation : "",
      country           : country ? country : "",
      phone             : phone ? phone : "",
      address           : address ? address : "",
      'age-group'       : age_group ? age_group : "",
      'favorite-color'  : favorite_color ? favorite_color : "",
      'favorite-genre'  : favorite_genre ? favorite_genre : "",
      'gamer-tag'       : gamer_tag ? gamer_tag : "",
      bio               : bio ? bio : "",
      image             : img_url ? img_url : profile_image
    }).then(function() {
      window.location.href = window.location.origin + $(elem).attr('action');
    });
  }

  function editProfile() {
    $("#main-content").removeClass("edit-profile");
    var currUser = firebase.auth().currentUser;
    firebase.database().ref(["Users", currUser.uid].join('/')).once('value')
    .then(function(snap){
      var profile = snap.val();
      $('.uprofile-image .image').attr('style', 'background-image: url(' + preFilledImg(currUser.photoURL) + ');');
      $('.show-name').text([profile.firstname, profile.middle, profile.lastname].join(' '));
      $('.show-occupation').text(preFilledKey(profile.occupation));
      $('#first_name').val(profile.firstname);
      $('#middle_name').val(profile.middle);
      $('#last_name').val(profile.lastname);
      $('#occupation').val(profile.occupation);
      $('#country').val(profile.country).trigger('change');

      // if(profile.identity) {
      //   $('#identity').children('option').each(function() {
      //     if($(this).val().toLowerCase() == profile.identity.toLowerCase()) {
      //       $(this).attr('selected', true);
      //     }
      //   });
      // }

      if(profile.phone)
        c_code = profile.phone.substr(profile.phone.indexOf('('), profile.phone.indexOf(')'));
      else
        c_code = '(999)';

      $('#phone').inputmask('+' + c_code + ' 999 999 999');
      $('#phone').val(profile.phone.substr(profile.phone.indexOf(')')+2, profile.phone.length-1));
      if(profile['age-group']) {
        $('#age_group').children('option').each(function() {
          if($(this).val().toLowerCase() == profile['age-group'].toLowerCase()) {
            $(this).attr('selected', true);
          }
        });
      }
      $('#address').val(profile.address);
      $('#favorite_color').val(profile['favorite-color']);
      $('#favorite_genre').val(profile['favorite-genre']);
      $('#gamer_tag').val(profile['gamer-tag']);
      $('#bio').val(profile.bio);
    }).catch(function(error){
      console.log(error);
    });
    var profile_qstns = new Array();
    var user_qstns = new Array();
    firebase.database().ref([
      "Questions", "UserQuestions", currUser.uid
    ].join('/')).once('value').then(function(snap) {
      var user_questions = snap.val() ? snap.val() : [],
          sel_questions   = $('.selected-questions');
      if (user_questions.constructor == Array)
      {
        user_questions = user_questions.filter(Boolean);
      }    
      for (var key in user_questions){
        user_qstns.push(key);
      }
      if(user_questions) {
        $.each(user_questions, function(idx, val) {
          var question_k  = idx,
              choice_k    = val.choice;

          firebase.database().ref([
            "Questions", "ProfileQuestion", question_k
          ].join('/')).once('value').then(function(snap){
            if(snap.val()) {
              sel_questions.append(selectedQuestion({
                question_id: question_k ,
                question: snap.val().title,
                choice_id: choice_k,
                choice: snap.val().choices[choice_k].choiceText
              }, true));
              btnSelectedQuestions('data-question-id="' + question_k + '"');
            }
          });
        });
      }
      firebase.database().ref(["Questions", "ProfileQuestion"]
      .join('/')).once('value').then(function(snap){
            var questions = snap.val();
            for (var key in questions){
              profile_qstns.push(key);
            }
            rest_qstns = arr_diff(profile_qstns, user_qstns);
            $.each(rest_qstns, function(id){
              var q_id = rest_qstns[id];
              firebase.database().ref(["Questions", "ProfileQuestion", q_id]
              .join('/')).once('value').then(function(snap){
                if(snap.val()) {
                  sel_questions.append(selectedQuestion({
                    question_id: q_id,
                    question: snap.val().title,
                    choice_id: "",
                    choice: ""
                  }, true));
                  btnSelectedQuestions('data-question-id="' + q_id + '"');
                }
              });
            });
          });    
    });
  }



  function arr_diff (a1, a2) {

    var a = [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
}

  function preFilledKey(key) {
    return key || key !== '' ? key : 'Unset detail';
  }

  function preFilledImg(key) {
    return key !== null ? key : '/assets/default-profile.png';
  }
});

function notifierVisibility(event) {
  var notifier = $('#cube-collab-indicator');
  var pos       = notifier.children('.indicator-holder').children('i');
  if(event) {
    var desc = $.trim(event.cubeDesc).substr(0, 58);
    
    if( desc.length == 58 ) desc += '...';

    notifier.find('.title span').text( event.cubeName );
    notifier.find('.description').text( desc ? desc : 'No description set.');

    var collabCont = notifier.find('p');
    if(event.cubeCollab) collabCont.show();
    else collabCont.hide();

    if(pos.hasClass('fa-caret-right')) {
      notifier.find('.fa-caret-right').css('top', (notifier.height()/2 - 15) + 'px');
      notifier.css({
        'left':     (event.clientX - (notifier.width() + 25)) + 'px',
        'top':      (event.clientY - notifier.height()/2) + 'px',
        'display':  'block',
        'opacity':  '0.9',
        'filter':   'alpha(opacity=90)'
      });
    } else if(pos.hasClass('fa-caret-down')) {
      var leftOffset = (event.clientBounding.width - notifier.width()) / 2;
      notifier.find('.fa-caret-right').css('top', (notifier.height()/2 - 15) + 'px');
      notifier.css({
        'left':     (event.clientBounding.left + (leftOffset - 7.5)) + 'px',
        'top':      (event.clientBounding.top - notifier.height() - 25) + 'px',
        'display':  'block',
        'opacity':  '0.9',
        'filter':   'alpha(opacity=90)'
      });
    }
  } else
    notifier.css({
      'left': "290px",
      'top':  '75px',
      'display': 'none',
      'opacity': '0',
      'filter': 'alpha(opacity=0)'
    });
}