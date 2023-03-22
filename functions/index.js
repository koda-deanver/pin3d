const functions   = require('firebase-functions');
const nodemailer  =  require('nodemailer');

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
});
const APP_NAME = 'SindyCUBEs';

exports.sendCubeCollabs = functions.https.onCall((data, context) => {
  const from  = data.from;
  const to    = data.to;
  const cube  = data.cube;
  if (!context.auth) {
  // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
        'while authenticated.');
  } else {
    return emailCollabs(from, to, cube);
  }
});

exports.sendInvitation = functions.https.onCall((data, context) => {
  const from    = data.from;
  const to      = data.to;
  const number  = data.number;
  const message = data.message;
  const url     = data.url;

  if (!context.auth) {
  // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
        'while authenticated.');
  } else {
    return emailInvitation(from, to, number, message, url);
  }
});



async function emailCollabs(fromEmail, toEmail, cube) {
  const mailOptions = {
    from: `${APP_NAME} <${fromEmail}>`,
    to: toEmail
  };

  mailOptions.subject = `${cube.name} Notification`;
  // mailOptions.html = '<p>' +
  //   `${fromEmail} has invited you as a colloborator to ${cube.name}.` +
  //   '<br>' +
  //   `Click <a href='${cube.url}'>here</a> to visit this cube.`
  // '</p>';
  mailOptions.html = '<div>' +
    '<h2>' +
      `Greetings and Salutations ${cube.recipient}` +
    '</h2>' +
    '<p>' +
      'This is an automatic email, sent by a mindless robot to let you know that your friend ' +
      `${cube.owner} has invited you to collaborate with them on ` +
      `<a href='${cube.appurl}'>${cube.appurl}</a>`+
    '</p>' +
    '<p>' +
      'To collaborate with real live human beings, please follow the link to gain access to the project cube.' +
    '</p>' +
    '<p>' +
      `<a href='${cube.url}'>CLICK HERE</a>` +
    '</p>' +
    '<p>' +
      'We’re very excited to invite you to the Seamless Integrated Dynamics network of artists, creators, storytellers, and techies.' +
    '</p>' +
    '<p>' +
      'Warmest Regards,' +
      '<br>' +
      'Sindy' +
    '</p>' +
    '<img src="https://firebasestorage.googleapis.com/v0/b/check-yo-development-a2173.appspot.com/o/emojis%2Fsindylogo.png?alt=media&amp;token=0c8e1bd4-17ca-4a50-a22e-59e53bd9fbe4" style="width: 50px;">' +
    '<br>' +
    '<p>' +
      'Seamless Integrated Dynamics Inc.' +
      '<br>' +
      '<a href="Sindy.io">Sindy.io</a>' +
      '<br>' +
      `<a href='${cube.appurl}'>${cube.appurl}</a>`+
    '</p>' +
  '</div>';

  // return mailTranstport.sendMail(mailOptions).then(() => {
  //   return { success: 1, msg: `Email has been succesfull sent.` };
  // }).catch((err) => {
  //   return { success: 0, msg: `Email was not sent. Kindly resend`, err: err};
  // });

  info = await mailTransport.sendMail(mailOptions);
  console.log(info);
  return { success: 1, msg: `Email has been succesfull sent.` };
}

async function emailInvitation(fromEmail, toEmail, num, msg, redirect) {
  const mailOptions = {
    from: `${APP_NAME} <${fromEmail}>`,
    to: toEmail
  };

  mailOptions.subject = `${APP_NAME} Invitation`;

  htmlbody = '<div>' +
    '<h2>' +
      `You have received an invitation to join Sindy-XR.` +
    '</h2>';

  // if(msg !== '')
  //   htmlbody += '<p>' + `${msg}` + '</p>';
  // else
  //   htmlbody += '<p>' +
  //     'We’re very excited to invite you to the Seamless Integrated Dynamics network of artists, creators, storytellers, and techies.' +
  //   '</p>';

  htmlbody += '<p>' +
    'YOU HAVE BEEN INVITED TO JOIN ME TO BUILD NEXT LEVEL COLLABORATION WITH SINDY-XR.' +
  '</p>';

  htmlbody += '<p>' +
    'Sincerely hope you will join me,' +
  '</p>';

  htmlbody += '<p>' +
    'Charles' +
  '</p>';

  htmlbody += '<br><br>';

  if(num !== '')
    htmlbody += '<p>' + `You can reach me at 9174534762` + '</p>';

  htmlbody += '<p>' +
      `<a href='${redirect}'>CLICK HERE TO VISIT ${APP_NAME}</a>` +
    '</p>' +
    '<p>' +
      'Warmest Regards' +
    '</p>' +
    '<img src="https://firebasestorage.googleapis.com/v0/b/check-yo-development-a2173.appspot.com/o/emojis%2Fsindylogo.png?alt=media&amp;token=0c8e1bd4-17ca-4a50-a22e-59e53bd9fbe4" style="width: 50px;">' +
    '<br>' +
    '<p>' +
      'Seamless Integrated Dynamics Inc.' +
      '<br>' +
      '<a href="Sindy.io">Sindy.io</a>' +
    '</p>' +
  '</div>';

  mailOptions.html = htmlbody;

  // return mailTranstport.sendMail(mailOptions).then(() => {
  //   return { success: 1, msg: `Email has been succesfull sent.` };
  // }).catch((err) => {
  //   return { success: 0, msg: `Email was not sent. Kindly resend`, err: err};
  // });
  info = await mailTransport.sendMail(mailOptions);
  console.log(info);
  return { success: 1, msg: `Email has been succesfull sent.` };
}