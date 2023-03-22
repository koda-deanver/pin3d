
$(document).ready(function() {

  firebase.auth().onAuthStateChanged(function(user) {
    if (user && allowRedirect) {
      r_url_path = '/accounts/cubes';

      if(sessionStorage.getItem("cube_redirect")){
        r_url_path = sessionStorage.getItem("cube_redirect")
        sessionStorage.removeItem("cube_redirect");
      }
      
      window.location.href =  window.location.origin + r_url_path;
    }
  });

  $("#fb-sign-in").click(function() {
    if(hasChild('.register-wrapper.homepage')){
      if(!$(this).parent('div').parent('figure').hasClass('unfold'))
        return;
    }

    allowRedirect = false;
    $('.alert-danger').remove('slow');
    var fbprovider = new firebase.auth.FacebookAuthProvider();
    firebase.auth().signInWithPopup(fbprovider).then(function(result) {
      // console.log(result);
      var token     = result.credential.accessToken,
          user      = result.user,
          provider  = result.additionalUserInfo.providerId,
          profInfo  = result.additionalUserInfo.profile;

      firebase.database().ref('Users/' + user.uid).once('value').then(function(snapshot) {
        var redirectUrl = window.location.origin + '/accounts/cubes';

        if(sessionStorage.getItem("cube_redirect")){
          redirectUrl =  window.location.origin + sessionStorage.getItem("cube_redirect");
          sessionStorage.removeItem("cube_redirect")
        }

        if(!snapshot.val()) {
          var profile = {
            bio         : '',
            email       : profInfo.email,
            firstname   : profInfo.first_name ? profInfo.first_name : '',
            lastname    : profInfo.last_name ? profInfo.last_name : '',
            'gamer-tag' : '',
            country     : '',
            address     : '',
            phone       : '',
            image       : user.photoURL ? user.photoURL : '',
            status      : 'online'
          };

          profile = $.extend(profile, authExtender(provider, profInfo.id));
          profile = $.extend(profile, {userId: user.uid});
          profile = $.extend(profile, defaultExtraFields());

          var addUser = firebase.database().ref(["Users", user.uid].join('/'));
          addUser.set(profile, function() {
            update_uuid_cube_req(user.uid, profInfo.email);
            // window.location.href = redirectUrl;
          });
        } else {
          var usr         = snapshot.val(),
              updateUser  = firebase.database().ref(["Users", user.uid].join('/'));
          updateUser.update({
            firstname   : profInfo.first_name ? profInfo.first_name : usr.firstname,
            lastname    : profInfo.last_name ? profInfo.last_name : usr.lastname,
            image       : user.photoURL ? user.photoURL : '',
            status      : 'online'
          }, function() {
            window.location.href = redirectUrl;
          });
        }
      });
    }).catch(function(error) {
      allowRedirect = true;
      var errorCode = error.code;
      var errorMessage = error.message;
      var email = error.email;
      var credential = error.credential;

      if( errorCode === "auth/account-exists-with-different-credential" ) {
        var message = 'Account ' + email + ' already exists on other sign-in methods.';
        inValidAuth($('#form-sign-in'), message);
      } else {
        // console.log('errorCode');
        // console.log(errorCode);
        // console.log('>==================<');
        // console.log('errorMessage');
        console.log(errorMessage);
      }
      // ...
    });
  });

  $("#google-sign-in").click(function() {
    if(hasChild('.register-wrapper.homepage')){
      if(!$(this).parent('div').parent('figure').hasClass('unfold'))
        return;
    }

    allowRedirect = false;
    $('.alert-danger').remove('slow');
    var gprovider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(gprovider).then(function(result) {
      // console.log(result);
      var token     = result.credential.accessToken,
          user      = result.user,
          provider  = result.additionalUserInfo.providerId,
          profInfo  = result.additionalUserInfo.profile;

      firebase.database().ref('Users/' + user.uid).once('value').then(function(snapshot) {
        redirectUrl = window.location.origin + '/accounts/cubes';
        if(sessionStorage.getItem("cube_redirect")){
          redirectUrl =  window.location.origin + sessionStorage.getItem("cube_redirect");
          sessionStorage.removeItem("cube_redirect")
        }

        if(!snapshot.val()) {
          var profile = {
            bio         : '',
            email       : profInfo.email,
            firstname   : profInfo.given_name ? profInfo.given_name : '',
            // middle      : '',
            lastname    : profInfo.family_name ? profInfo.family_name : '',
            'gamer-tag' : '',
            country     : '',
            address     : '',
            phone       : '',
            image       : profInfo.picture? profInfo.picture : '',
            status      : 'online'
          };

          profile = $.extend(profile, authExtender(provider, profInfo.id));
          profile = $.extend(profile, {userId: user.uid});
          profile = $.extend(profile, defaultExtraFields());

          var addUser = firebase.database().ref(["Users", user.uid].join('/'));
          addUser.set(profile, function() {
            update_uuid_cube_req(user.uid, profInfo.email);
            // window.location.href = redirectUrl;
          });
        } else {
          var usr         = snapshot.val(),
              updateUser  = firebase.database().ref(["Users", user.uid].join('/'));
          updateUser.update({
            firstname   : profInfo.given_name ? profInfo.given_name : usr.firstname,
            lastname    : profInfo.family_name ? profInfo.family_name : usr.lastname,
            image       : profInfo.picture? profInfo.picture : '',
            status      : 'online'
          }, function() {
            window.location.href = redirectUrl;
          });
        }
      });
    }).catch(function(error) {
      allowRedirect = true;
      var errorCode = error.code;
      var errorMessage = error.message;
      var email = error.email;
      var credential = error.credential;

      if( errorCode === "auth/account-exists-with-different-credential" ) {
        var message = 'Account ' + email + ' already exists on other sign-in methods.';
        inValidAuth($('#form-sign-in'), message);
      } else {
        // console.log('errorCode');
        // console.log(errorCode);
        // console.log('>==================<');
        // console.log('errorMessage');
        console.log(errorMessage);
      }
      // ...
    });
  });

  $('#form-sign-in').submit(function(e){
    e.preventDefault();
    allowRedirect = false;
    $('.alert-danger').remove();
    var email       = $(this).find('#email'),
        password    = $(this).find('#password'),
        success     = true;

    unErrorFeild(password);
    unErrorFeild(email);

    if(!validateEmail($.trim(email.val()))) {
      success = false;
    }

    if(password.val().length < 6){
      success = false;
      hasErrorField(password, "Password length must be 6 characters or greater.");
    }

    if($.trim(email.val()) == "")
      hasErrorField(email, "Email can't be blank.");

    if(password.val() == "")
      hasErrorField(password, "Password can't be blank.");

    if(success){
        signInUser({
          email: $.trim(email.val()),
          password: password.val()
        }, window.location.origin + $('#form-sign-in').attr('action'));
    } else {
      email.focus();
      password.val('');
      allowRedirect = true;
    }
  });

  // $('.btn-sign-in').click(function(){
  //    // $('#form-sign-in').trigger('submit');
  //    alert("asdf");
  // });

  function validateEmail(email) {
    var eValidation = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return eValidation.test(email);
  }

  function hasErrorField(feild, msg) {
    feild.addClass('form-control-danger');
    feild.parent('div').addClass('has-danger');
    if(msg !== "")
      controlFeedback(feild.parent('div'), msg);
  }

  function controlFeedback(controlElem, msg) {
    if (!controlElem.children("small").is(':visible')) {
      controlElem.append('<small class="form-text text-danger font-italic">' +
        msg +
        '</small>'
      );
    } else {
      controlElem.children("small").html(msg);
    }
  }

  function inValidAuth(formCont, msg) {
    if(!formCont.children('.alert.alert-danger').is(':visible'))
      formCont.prepend(
        '<div class="alert alert-danger" role="alert">' +
          '<strong>' + msg + '</strong>' +
        '</div>'
      );
  }

  function signInUser(userDetail, url) {
    var email       = userDetail.email,
        password    = userDetail.password;


    firebase.auth().fetchProvidersForEmail(email).then(function(prov) {
      if(prov[0] === 'password' || prov.length <= 0) {
        firebase.auth().signInWithEmailAndPassword(email, password)
          .then(function(user){
            // console.log(user);
            var updateUser  = firebase.database().ref(["Users", user.uid].join('/'));
            updateUser.update({
              status      : 'online'
            }, function() {
              window.location.href = url;
            });
          })
          .catch(function(error) {
            // console.log(error);
            console.log(error.code + ": " + error.message);
            var fEmail = $("#form-sign-in").find("#email"),
                fPass  = $("#form-sign-in").find("#password");
            inValidSignin($("#form-sign-in"));
            fPass.val('');
            fEmail.focus();
            
          });
      } else {
        console.log(prov);
        prov[0] = prov[0].replace('.com', '');
        var msg = "The email was registered through " +
                  prov[0].replace(prov[0][0], prov[0][0].toUpperCase()) +
                  ". Please sign in with that provider.";
        inValidWithMsg($("#form-sign-in"), msg);
      }
    });
  }
});