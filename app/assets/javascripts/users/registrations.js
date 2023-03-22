$(document).ready(function(){

  firebase.auth().onAuthStateChanged(function(user) {
    if (user && allowRedirect) {
      console.log(user);
      window.location.href = (window.location.origin + $('#form-sign-up').attr('action'));
    }
  });

  if ($.isFunction($.fn.select2)) {

    $("#country").select2({
        placeholder: 'Country',
        allowClear: true
    }).on('select2-open', function() {
        // Adding Custom Scrollbar
        $(this).data('select2').results.addClass('overflow-hidden').perfectScrollbar();
    });
  }

  $("#country").change(function() {
    var country = $(this).val();
    if( country ) {
      $.ajax({
        url: "/accounts/get_country_code",
        data: {country: country}
      }).done(function(result) {
        var pMask = "";
        $.each(result.country_code.split(''), function(idx, val) {
          // console.log(val);
          if(parseInt(val) === 9)
            pMask += "\\" + val;
          else
            pMask += val;
        });
        $('#phone').inputmask("+(" + pMask + ") 999 999 999");

      });
    }
  });

  $('#form-sign-up').submit(function(e){
    e.preventDefault();
    allowRedirect = false;
    var isHome      = hasChild('.register-wrapper.homepage'),
        username    = !isHome ? $(this).find('#username') : '',
        email       = $(this).find('#email'),
        password    = $(this).find('#password'),
        cPassword   = $(this).find('#confirm_password'),
        bio         = !isHome ? $(this).find('#bio') : '',
        firstname   = $(this).find('#firstname'),
        // middlename  = $(this).find('#middlename'),
        lastname    = $(this).find('#lastname'),
        gamer_tag   = !isHome ? $(this).find('#gamer_tag') : '',
        country     = !isHome ? $(this).find('#country') : '',
        // identity    = $(this).find('#identity'),
        phone       = !isHome ? $(this).find('#phone') : '',
        address     = !isHome ? $(this).find('#address') : '',
        success     = true;

      
    if(!validateEmail($.trim(email.val()))) {
      hasErrorField(email, "Email is invalid.");
      success = false;
      $('html, body').animate({scrollTop: $('#register').offset().top}, 50);
    } else {
      unErrorFeild(email);
    }

    var minLen = password.val().length < 6 && cPassword.val().length < 6;
    if(password.val() != cPassword.val() || minLen) {
      var msg = "Password does not match confirmation password.";
      if(minLen & password.val() == cPassword.val())
        msg = "Minimum of 6 characters.";

      hasErrorField(password, msg);
      hasErrorField(cPassword, msg);
      success = false;
      $('html, body').animate({scrollTop: $('#register').offset().top}, 50);
    } else {
      unErrorFeild(password);
      unErrorFeild(cPassword);
    }
  

    if(success) {
      // to be worked on
      var userDetail = {
            email       : $.trim(email.val()),
            password    : $.trim(password.val()),
            bio         : $.trim(bio.val()),
            firstname   : $.trim(firstname.val()),
            // middle      : $.trim(middlename.val()),
            lastname    : $.trim(lastname.val()),
            'gamer-tag' : $.trim(gamer_tag.val()),
            country     : $.trim(country.val()),
            phone       : $.trim(phone.val()),
            address     : $.trim(address.val()),
            image       : "",
            status      : 'online'
            // identity    : $.trim(identity.val()),
          },
          url = window.location.origin +  $('#form-sign-up').attr('action');

      userDetail = $.extend(userDetail, authExtender("", null));
      signUpUser(userDetail, url);
    } else {
      allowRedirect = true;
    }
  });

  $('#form-forgot').submit(function(e) {
    e.preventDefault();
    var auth = firebase.auth(),
        success = true,
        email = $(this).find('#email');

    if(!validateEmail($.trim(email.val()))) {
      success = false;
    }

    if (success) {
      firebase.auth().fetchProvidersForEmail($.trim(email.val())).then(function(prov) {
        if(prov[0] == 'google.com' || prov[0] == 'facebook.com')
          hasErrorField(email, "Email entered is from a third party login (" + prov[0] + "). Cannot proceed with resetting the password. Please login using the appropriate third party login suggested.");
        else {
          auth.sendPasswordResetEmail($.trim(email.val())).then(function() {
            resetPass($('#form-forgot'));
            $('#form-forgot').find('input').attr('disabled', true);
            $('#form-forgot').find('button').attr('disabled', true);
          }).catch(function(error) {
            hasErrorField(email, error.message);
          });
        }
      });
    } else {
      hasErrorField(email, "Please enter a valid email address.");
    }
  });

  function signUpUser(profile, url) {
    signedIn        = true;
    firebase.auth().createUserWithEmailAndPassword(profile.email, profile.password)
    .then(function(user){
      delete profile.password;
      profile = $.extend(profile, {userId: user.uid});
      profile = $.extend(profile, defaultExtraFields());

      var addUser = firebase.database().ref(["Users", user.uid].join('/'));
      addUser.set(profile, function(error){
        update_uuid_cube_req(user.uid, profile.email);
        // window.location.href = url;
      });
    }).catch(function(error) {
      if(error.code === "auth/email-already-in-use") {
        var email = $("#form-sign-up").find("#email");
        hasErrorField(email, error.message);
        $("#form-sign-up").find("#password").val('');
        $("#form-sign-up").find("#confirm_password").val('');
        $('html, body').animate({scrollTop: $('#register').offset().top}, 50);
      } else {
        console.log("error");
        console.log(error);
      }
    });
  }
});