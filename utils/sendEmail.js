const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
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
