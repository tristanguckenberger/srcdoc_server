const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SEND_EMAIL_USERNAME,
    pass: process.env.SEND_EMAIL_API_KEY,
  },
});

exports.sendVerificationEmail = async (email, token) => {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Play Engine | Email Verification" <tristan@srcdoc.io>', // sender address
    to: `${email}`, // list of receivers
    subject: "Verify Your Email", // Subject line
    text: `Your verification code is: ${token}`, // plain text body
    html: `<b>Your verification code is:<h1>${token}</h1></b>`, // html body
  });
};

exports.sendResetPasswordEmail = async (email, token) => {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Play Engine | Password Reset" <tristan@srcdoc.io>', // sender address
    to: `${email}`, // list of receivers
    subject: "Reset Y", // Subject line
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
    Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n
    playengine.xyz/reset-password/${token}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n`, // plain text body
    html: `<p style="background-color:#1d1e20; border-radius: 8px; padding: 10px; color: #ffffff;">You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
    Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n
    playengine.xyz/reset-password/${token}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n</p>`, // html body
  });
  return info;
};
