// gameObject.js
// Base game object class that all game objects inherit from.
// This file provides the default implementation for a game object.

class GameObject {
  constructor(props = {}) {
    this.id = props.id || `object-${Date.now()}`;
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

export default GameObject;
