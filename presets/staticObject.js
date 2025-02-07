// staticObject.js
// Base class for static objects in the game.
// This file provides the default implementation for static objects.

class StaticObject {
  constructor(props = {}) {
    this.x = props.x || 0;
    this.y = props.y || 0;
    this.width = props.width || 50;
    this.height = props.height || 50;
    this.color = props.color || "#000";
  }

  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}

export default StaticObject;
