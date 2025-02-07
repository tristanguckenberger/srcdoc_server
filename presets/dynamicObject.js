// dynamicObject.js
// Base class for dynamic objects in the game.
// This file provides the default implementation for dynamic objects.

class DynamicObject {
  constructor(props = {}) {
    this.x = props.x || 0;
    this.y = props.y || 0;
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.mass = props.mass || 1;
    this.physicsEnabled = props.physicsEnabled || false;
  }

  update(deltaTime) {
    if (this.physicsEnabled) {
      this.velocity.x += this.acceleration.x * deltaTime;
      this.velocity.y += this.acceleration.y * deltaTime;
      this.x += this.velocity.x * deltaTime;
      this.y += this.velocity.y * deltaTime;
    }
  }
}

export default DynamicObject;
