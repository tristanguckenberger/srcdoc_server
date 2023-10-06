/**
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 *
 * If the user is logged in and
 * the new game title is empty,
 * create a placeholder title
 */
exports.placeholder = async (req, res, next) => {
  if (req.user && (!req.body.title || req.body.title === "")) {
    const now = new Date();
    const user = req.user;
    req.body.title = `New Game - ${
      user?.username ?? user.email
    }_${now.getUTCFullYear()}_${now.getUTCDay()}_${now.getUTCHours()}_${now.getUTCMilliseconds()}`;
  }
  next();
};
