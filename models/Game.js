class Game {
  constructor(
    id,
    title,
    description,
    htmlCode,
    cssCode,
    jsCode,
    userId,
    published
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.htmlCode = htmlCode;
    this.cssCode = cssCode;
    this.jsCode = jsCode;
    this.userId = userId;
    this.published = published;
  }
}

module.exports = Game;
