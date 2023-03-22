function showErrorMessage(msg) {
    Messenger({
        extraClasses: 'messenger-fixed messenger-on-right messenger-on-bottom',
        theme: 'flat'
    }).post({
        message: msg,
        type: 'error',
        showCloseButton: true
    });
}

function showSuccessMessage(msg) {
    Messenger({
        extraClasses: 'messenger-fixed messenger-on-right messenger-on-bottom',
        theme: 'flat'
    }).post({
        message: msg,
        type: 'success',
        showCloseButton: true
    });
}

function showCustomSuccessMessage(msg, notif) {
    Messenger({
        extraClasses: 'messenger-fixed messenger-on-right messenger-on-bottom ' + notif,
        theme: 'flat'
    }).post({
        message: msg,
        type: 'success',
        showCloseButton: true
    });
}

function progressMessage() {
    var i = 0;
    Messenger({
        extraClasses: 'messenger-fixed messenger-on-right messenger-on-bottom',
        theme: 'flat'
    }).run({
        errorMessage: 'Error destroying alien planet. Retrying...',
        successMessage: 'Alien planet destroyed!',
        action: function(opts) {
            if (++i < 2) {
                return opts.error({
                    status: 500,
                    readyState: 0,
                    responseText: 0
                });
            } else {
                return opts.success();
            }
        }
    });
}

function showSuccess(msg) {
    Messenger({
        extraClasses: 'messenger-fixed messenger-on-right messenger-on-bottom',
        theme: 'flat'
    }).post({
        message: msg,
        type: 'success',
        showCloseButton: true
    });
}
