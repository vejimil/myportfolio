
(function () {
  const GAME_WIDTH = 1600;
  const GAME_HEIGHT = 1280;
  const PLAYER_SPEED = 200;
  const PLAYER_DIAGONAL_SPEED = 141;
  const SPAWN_TILE = { x: 4, y: 84 };
  const VISIGI_TILE = { x: 66, y: 32 };
  const LASER_SPEED = 700;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function tileToWorld(tileX, tileY, tileSize) {
    return {
      x: tileX * tileSize + tileSize / 2,
      y: tileY * tileSize + tileSize / 2
    };
  }

  class MapRenderer {
    constructor(scene) {
      this.scene = scene;
      this.rendered = [];
      this.tileSize = 16;
    }

    render(map, tilesTextureKey) {
      this.clear();
      this.tileSize = map.tileSize;

      map.layers.forEach((layer, index) => {
        const container = this.scene.add.container(0, 0);
        container.name = layer.name;
        container.setDepth(this.depthForLayer(layer.name, index));
        const images = [];

        for (const tile of layer.tiles) {
          const img = this.scene.add.image(
            tile.x * this.tileSize + this.tileSize / 2,
            tile.y * this.tileSize + this.tileSize / 2,
            tilesTextureKey,
            Number(tile.id)
          );
          img.setOrigin(0.5);
          img.name = `${layer.name}:${tile.x},${tile.y}`;
          img.setData('tileXY', { x: tile.x, y: tile.y });
          images.push(img);
          container.add(img);
        }

        this.rendered.push({ container, images });
      });
    }

    depthForLayer(name, index) {
      const n = String(name || '').toLowerCase();
      if (n.includes('background')) return -100;
      if (n.includes('back')) return -10;
      if (n.includes('wires')) return -8;
      if (n.includes('front')) return 100;
      return index * 10;
    }

    clear() {
      this.rendered.forEach((layer) => {
        layer.images.forEach((img) => img.destroy());
        layer.container.destroy();
      });
      this.rendered = [];
    }
  }

  class MapCollisionManager {
    constructor(scene) {
      this.scene = scene;
      this.tileSize = 16;
      this.staticColliders = null;
      this.pendingPlayers = [];
    }

    build(map, tilesTextureKey) {
      this.clear();
      this.tileSize = map.tileSize;
      this.staticColliders = this.scene.physics.add.staticGroup();

      for (const layer of map.layers) {
        if (!layer.collider) continue;
        for (const tile of layer.tiles) {
          const cx = tile.x * this.tileSize + this.tileSize / 2;
          const cy = tile.y * this.tileSize + this.tileSize / 2;
          const img = this.staticColliders.create(cx, cy, tilesTextureKey);
          img.name = `collider:${layer.name}:${tile.x},${tile.y}`;
          img.setData('layer', layer.name);
          img.setData('tileXY', { x: tile.x, y: tile.y });
          img.setVisible(false);
          img.setDisplaySize(this.tileSize, this.tileSize);
          const body = img.body;
          body.setSize(this.tileSize, this.tileSize);
          body.updateFromGameObject();
        }
      }

      this.attachPendingPlayers();
    }

    attachPlayer(playerSprite) {
      if (this.staticColliders) {
        this.scene.physics.add.collider(playerSprite, this.staticColliders);
      } else {
        this.pendingPlayers.push(playerSprite);
      }
    }

    attachPendingPlayers() {
      if (!this.staticColliders) return;
      this.pendingPlayers.forEach((sprite) => {
        this.scene.physics.add.collider(sprite, this.staticColliders);
      });
      this.pendingPlayers = [];
    }

    clear() {
      if (this.staticColliders) {
        this.staticColliders.clear(true, true);
        this.staticColliders = null;
      }
    }
  }

  class MapManager {
    constructor(scene) {
      this.scene = scene;
      this.renderer = new MapRenderer(scene);
      this.collision = new MapCollisionManager(scene);
      this.currentMapData = null;
      this.currentTilesTextureKey = 'tiles:light-village-2';
      this.lastTileSize = 16;
    }

    async load(mapKey) {
      const data = this.scene.cache.json.get(mapKey);
      if (!data) {
        throw new Error(`Missing map data for ${mapKey}`);
      }

      this.currentMapData = data;
      this.lastTileSize = data.tileSize;
      const worldWidth = data.tileSize * data.mapWidth;
      const worldHeight = data.tileSize * data.mapHeight;
      this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
      this.scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

      this.renderer.render(data, this.currentTilesTextureKey);
      this.collision.build(data, this.currentTilesTextureKey);
      return true;
    }

    attachPlayer(playerSprite) {
      this.collision.attachPlayer(playerSprite);
    }

    getTileSize() {
      return this.lastTileSize;
    }

    getCurrentMapData() {
      return this.currentMapData;
    }

    getTilesTextureKey() {
      return this.currentTilesTextureKey;
    }
  }

  class AstronautPlayer {
    constructor(scene, x, y) {
      this.scene = scene;
      this.sprite = scene.physics.add.sprite(x, y, 'player', 0);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setDepth(1000);
      this.sprite.setOrigin(0.5, 1);
      this.sprite.body.setSize(32, 48);
      this.sprite.body.setOffset(16, 16);

      this.lastDir = 'down';
      this.dirDownAt = { left: 0, right: 0, up: 0, down: 0 };
      this.wasMoving = false;
      this.isMirrorEquipped = false;
      this.isMirroringPose = false;
      this.mirroringTimer = null;
      this.registerAnimations();
      this.sprite.setFrame(0);
    }

    registerAnimations() {
      const a = this.scene.anims;
      const ensure = (key, tex, start, end, frameRate = 8, repeat = -1) => {
        if (!a.exists(key)) {
          a.create({ key, frames: a.generateFrameNumbers(tex, { start, end }), frameRate, repeat });
        }
      };

      ensure('walk-down', 'player', 0, 3);
      ensure('walk-left', 'player', 4, 7);
      ensure('walk-right', 'player', 8, 11);
      ensure('walk-up', 'player', 12, 15);
      ensure('player-mirror-walk-down', 'player_walking_mirror', 0, 3);
      ensure('player-mirror-walk-left', 'player_walking_mirror', 4, 7);
      ensure('player-mirror-walk-right', 'player_walking_mirror', 8, 11);
      ensure('player-mirror-walk-up', 'player_walking_mirror', 12, 15);
    }

    update(cursors) {
      const anyJustDown = (key) => Phaser.Input.Keyboard.JustDown(key);
      const pressedLeft = cursors.left.isDown;
      const pressedRight = cursors.right.isDown;
      const pressedUp = cursors.up.isDown;
      const pressedDown = cursors.down.isDown;
      const now = this.scene.time.now;

      if (anyJustDown(cursors.left)) this.dirDownAt.left = now;
      if (anyJustDown(cursors.right)) this.dirDownAt.right = now;
      if (anyJustDown(cursors.up)) this.dirDownAt.up = now;
      if (anyJustDown(cursors.down)) this.dirDownAt.down = now;

      const chooseAxis = (negDown, posDown, negAt, posAt) => {
        if (negDown && posDown) return negAt > posAt ? -1 : 1;
        if (negDown) return -1;
        if (posDown) return 1;
        return 0;
      };

      let velocityX = chooseAxis(pressedLeft, pressedRight, this.dirDownAt.left, this.dirDownAt.right);
      let velocityY = chooseAxis(pressedUp, pressedDown, this.dirDownAt.up, this.dirDownAt.down);

      if (velocityX !== 0 && velocityY !== 0) {
        velocityX *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
        velocityY *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      }

      const speedX = this.isMirroringPose ? 0 : velocityX * PLAYER_SPEED;
      const speedY = this.isMirroringPose ? 0 : velocityY * PLAYER_SPEED;
      this.sprite.setVelocity(speedX, speedY);

      if (this.isMirroringPose) {
        const dirIndex = { down: 0, left: 1, right: 2, up: 3 };
        this.sprite.anims.stop();
        this.sprite.setTexture('player_mirroring', dirIndex[this.lastDir]);
        this.wasMoving = false;
        return;
      }

      const isMoving = velocityX !== 0 || velocityY !== 0;

      if (isMoving) {
        const candidates = [];
        if (pressedLeft) candidates.push('left');
        if (pressedRight) candidates.push('right');
        if (pressedUp) candidates.push('up');
        if (pressedDown) candidates.push('down');
        if (candidates.length) {
          let best = candidates[0];
          for (const dir of candidates) {
            if (this.dirDownAt[dir] >= this.dirDownAt[best]) best = dir;
          }
          this.lastDir = best;
        }

        const key = this.isMirrorEquipped ? `player-mirror-walk-${this.lastDir}` : `walk-${this.lastDir}`;
        this.sprite.anims.play(key, true);
        if (!this.wasMoving) {
          const anim = this.scene.anims.get(key);
          if (anim && anim.frames[1]) {
            this.sprite.anims.setCurrentFrame(anim.frames[1]);
          }
        }
      } else {
        this.sprite.anims.stop();
        if (this.isMirrorEquipped) {
          const key = `player-mirror-walk-${this.lastDir}`;
          const anim = this.scene.anims.get(key);
          if (anim && anim.frames[0]) {
            this.sprite.setTexture('player_walking_mirror');
            this.sprite.anims.setCurrentFrame(anim.frames[0]);
          }
        } else {
          const idle = { down: 0, left: 4, right: 8, up: 12 };
          this.sprite.setTexture('player', idle[this.lastDir]);
        }
      }

      this.sprite.setRotation(0);
      this.wasMoving = isMoving;
    }

    haltMovementAndIdle() {
      this.sprite.body.stop();
      this.sprite.setVelocity(0, 0);
      const idle = { down: 0, left: 4, right: 8, up: 12 };
      const mirrorIdle = { down: 0, left: 4, right: 8, up: 12 };
      this.sprite.anims.stop();
      if (this.isMirrorEquipped) {
        this.sprite.setTexture('player_walking_mirror', mirrorIdle[this.lastDir]);
      } else {
        this.sprite.setTexture('player', idle[this.lastDir]);
      }
      this.wasMoving = false;
    }

    setMirrorEquipped(equipped) {
      this.isMirrorEquipped = equipped;
      this.isMirroringPose = false;
      if (this.mirroringTimer) {
        this.mirroringTimer.remove(false);
        this.mirroringTimer = null;
      }
      this.haltMovementAndIdle();
    }

    startMirroringPose(durationMs = 100) {
      if (!this.isMirrorEquipped) return;
      this.isMirroringPose = true;
      this.sprite.body.stop();
      this.sprite.setVelocity(0, 0);
      if (this.mirroringTimer) this.mirroringTimer.remove(false);
      this.mirroringTimer = this.scene.time.delayedCall(durationMs, () => {
        this.isMirroringPose = false;
        this.mirroringTimer = null;
        this.haltMovementAndIdle();
      });
    }

    getLastDirection() {
      return this.lastDir;
    }
  }

  class GinsengPlayer {
    constructor(scene, x, y) {
      this.scene = scene;
      this.sprite = scene.physics.add.sprite(x, y, 'ginseng', 0);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setDepth(1000);
      this.sprite.setOrigin(0.5, 1);
      this.sprite.body.setSize(32, 48);
      this.sprite.body.setOffset(8, 0);

      this.lastDir = 'down';
      this.dirDownAt = { left: 0, right: 0, up: 0, down: 0 };
      this.wasMoving = false;
      this.form = 'ginseng';
      this.movementLocked = false;
      this.isAttackingSunflower = false;
      this.attackOnCooldown = false;
      this.registerAnimations();
      this.sprite.setFrame(0);
    }

    registerAnimations() {
      const a = this.scene.anims;
      const ensure = (key, tex, start, end, frameRate = 8, repeat = -1) => {
        if (!a.exists(key)) {
          a.create({ key, frames: a.generateFrameNumbers(tex, { start, end }), frameRate, repeat });
        }
      };

      ensure('ginseng-walk-down', 'ginseng', 0, 3);
      ensure('ginseng-walk-left', 'ginseng', 4, 7);
      ensure('ginseng-walk-right', 'ginseng', 8, 11);
      ensure('ginseng-walk-up', 'ginseng', 12, 15);
      ensure('ginseng-sunflower-down', 'ginseng_sunflower', 0, 3);
      ensure('ginseng-sunflower-left', 'ginseng_sunflower', 4, 7);
      ensure('ginseng-sunflower-right', 'ginseng_sunflower', 8, 11);
      ensure('ginseng-sunflower-up', 'ginseng_sunflower', 12, 15);
      ensure('ginseng-sunflower-down-once', 'ginseng_sunflower', 0, 3, 10, 0);
      ensure('ginseng-sunflower-left-once', 'ginseng_sunflower', 4, 7, 10, 0);
      ensure('ginseng-sunflower-right-once', 'ginseng_sunflower', 8, 11, 10, 0);
      ensure('ginseng-sunflower-up-once', 'ginseng_sunflower', 12, 15, 10, 0);
      ensure('thunder-strike', 'thunder', 0, 5, 16, 0);
    }

    update(keys) {
      if (!keys) return;

      if (this.movementLocked) {
        this.sprite.body.stop();
        this.sprite.setVelocity(0, 0);
        const idle = this.form === 'sunflower'
          ? { down: 0, left: 4, right: 8, up: 12 }
          : { down: 0, left: 4, right: 8, up: 12 };

        if (this.form === 'sunflower') {
          const justLeft = Phaser.Input.Keyboard.JustDown(keys.left);
          const justRight = Phaser.Input.Keyboard.JustDown(keys.right);
          const justUp = Phaser.Input.Keyboard.JustDown(keys.up);
          const justDown = Phaser.Input.Keyboard.JustDown(keys.down);

          if (!this.isAttackingSunflower && !this.attackOnCooldown) {
            if (justLeft) this.triggerSunflowerAttack('left');
            else if (justRight) this.triggerSunflowerAttack('right');
            else if (justUp) this.triggerSunflowerAttack('up');
            else if (justDown) this.triggerSunflowerAttack('down');
          }

          if (!this.isAttackingSunflower) {
            this.sprite.anims.stop();
            this.sprite.setFrame(idle[this.lastDir]);
          }
        } else {
          this.sprite.anims.stop();
          this.sprite.setFrame(idle[this.lastDir]);
        }

        this.wasMoving = false;
        return;
      }

      const now = this.scene.time.now;
      if (Phaser.Input.Keyboard.JustDown(keys.left)) this.dirDownAt.left = now;
      if (Phaser.Input.Keyboard.JustDown(keys.right)) this.dirDownAt.right = now;
      if (Phaser.Input.Keyboard.JustDown(keys.up)) this.dirDownAt.up = now;
      if (Phaser.Input.Keyboard.JustDown(keys.down)) this.dirDownAt.down = now;

      const chooseAxis = (negDown, posDown, negAt, posAt) => {
        if (negDown && posDown) return negAt > posAt ? -1 : 1;
        if (negDown) return -1;
        if (posDown) return 1;
        return 0;
      };

      let velocityX = chooseAxis(keys.left.isDown, keys.right.isDown, this.dirDownAt.left, this.dirDownAt.right);
      let velocityY = chooseAxis(keys.up.isDown, keys.down.isDown, this.dirDownAt.up, this.dirDownAt.down);

      if (velocityX !== 0 && velocityY !== 0) {
        velocityX *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
        velocityY *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      }

      this.sprite.setVelocity(velocityX * PLAYER_SPEED, velocityY * PLAYER_SPEED);
      const isMoving = velocityX !== 0 || velocityY !== 0;

      if (isMoving) {
        const candidates = [];
        if (keys.left.isDown) candidates.push('left');
        if (keys.right.isDown) candidates.push('right');
        if (keys.up.isDown) candidates.push('up');
        if (keys.down.isDown) candidates.push('down');
        if (candidates.length) {
          let best = candidates[0];
          for (const dir of candidates) {
            if (this.dirDownAt[dir] >= this.dirDownAt[best]) best = dir;
          }
          this.lastDir = best;
        }

        const prefix = this.form === 'sunflower' ? 'ginseng-sunflower-' : 'ginseng-walk-';
        const key = prefix + this.lastDir;
        this.sprite.anims.play(key, true);
        if (!this.wasMoving) {
          const anim = this.scene.anims.get(key);
          if (anim && anim.frames[1]) {
            this.sprite.anims.setCurrentFrame(anim.frames[1]);
          }
        }
      } else {
        this.sprite.anims.stop();
        const idle = { down: 0, left: 4, right: 8, up: 12 };
        const texture = this.form === 'sunflower' ? 'ginseng_sunflower' : 'ginseng';
        this.sprite.setTexture(texture, idle[this.lastDir]);
      }

      this.wasMoving = isMoving;
    }

    triggerSunflowerAttack(dir) {
      if (this.isAttackingSunflower || this.attackOnCooldown) return;
      this.lastDir = dir;
      const keyOnce = `ginseng-sunflower-${dir}-once`;
      this.isAttackingSunflower = true;
      this.attackOnCooldown = true;
      this.sprite.body.stop();
      this.sprite.setVelocity(0, 0);
      this.sprite.anims.play(keyOnce, true);

      const onUpdate = (_, frame) => {
        if (this.sprite.anims.getName() !== keyOnce) return;
        if (frame.isLast) {
          this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);
          this.sprite.emit('sunflower-shoot', {
            x: this.sprite.x,
            y: this.sprite.y,
            dir: this.lastDir
          });
        }
      };
      this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);

      this.sprite.once(`animationcomplete-${keyOnce}`, () => {
        this.isAttackingSunflower = false;
        this.attackOnCooldown = false;
        const idle = { down: 0, left: 4, right: 8, up: 12 };
        this.sprite.anims.stop();
        this.sprite.setFrame(idle[this.lastDir]);
      });
    }

    setForm(newForm) {
      if (this.form === newForm) return;
      this.form = newForm;
      this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE);
      this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
      this.isAttackingSunflower = false;
      this.attackOnCooldown = false;
      const texture = newForm === 'sunflower' ? 'ginseng_sunflower' : 'ginseng';
      const idle = { down: 0, left: 4, right: 8, up: 12 };
      this.sprite.setTexture(texture);
      this.sprite.anims.stop();
      this.sprite.setFrame(idle[this.lastDir]);
      this.sprite.body.setSize(32, 48);
      this.sprite.body.setOffset(16, 16);
    }

    toggleForm() {
      this.setForm(this.form === 'ginseng' ? 'sunflower' : 'ginseng');
    }

    isSunflowerForm() {
      return this.form === 'sunflower';
    }

    lockMovement() {
      this.movementLocked = true;
      this.sprite.body.stop();
      this.sprite.setVelocity(0, 0);
    }

    unlockMovement() {
      this.movementLocked = false;
    }
  }

  class LightNetworkSystem {
    constructor(scene, mapId, tilesKey, tileSize) {
      this.scene = scene;
      this.mapId = mapId.replace(/^map:/, '');
      this.tilesKey = tilesKey;
      this.tileSize = tileSize;
      this.lampsOffLayerName = 'lamps_off';
      this.flowersOffLayerName = 'flowers_off';
      this.overlay = this.scene.add.container(0, 0);
      this.overlay.setDepth(1200);
      this.overlay.setName(`light-overlay-${this.tilesKey}`);
      this.wiresSet = new Set();
      this.deviceTiles = new Map();
      this.lampTiles = new Set();
      this.reachableWireSet = new Set();
      this.simultaneousWindowMs = 500;
      this.lampClusters = [];
      this.lampActivatedAt = new Map();
      this.flowerGroups = [];
      this.buildFromMap();
    }

    destroy() {
      this.overlay?.destroy(true);
      this.wiresSet.clear();
      this.deviceTiles.clear();
      this.lampTiles.clear();
      this.reachableWireSet.clear();
      this.lampClusters.forEach((cluster) => cluster.sensor?.destroy());
      this.lampClusters = [];
      this.flowerGroups = [];
    }

    attachLaserGroup(lasers) {
      if (!this.lampClusters.length) return;
      for (const cluster of this.lampClusters) {
        if (!cluster.sensor) continue;
        this.scene.physics.add.overlap(
          cluster.sensor,
          lasers,
          (_, laser) => {
            const s = laser;
            if (s.active) {
              s.disableBody(true, true);
              s.destroy();
            }

            const now = this.scene.time.now;
            this.lampActivatedAt.set(cluster.id, now);
            this.flashLampCluster(cluster);
            this.rippleAlongWireSet(cluster.reachable);
            this.tryTriggerMultiLampFlowers();
          },
          undefined,
          this
        );
      }
    }

    buildFromMap() {
      const mapKey = `map:${this.mapId}`;
      const map = this.scene.cache.json.get(mapKey);
      if (!map) {
        console.warn('[LightNetworkSystem] Map not found in cache:', mapKey);
        return;
      }

      const wiresLayer = map.layers.find((layer) => layer.name === 'wires');
      if (!wiresLayer) {
        console.warn('[LightNetworkSystem] Required layer missing: wires');
        return;
      }

      this.wiresSet.clear();
      for (const tile of wiresLayer.tiles) {
        this.wiresSet.add(this.k(tile.x, tile.y));
      }

      this.lampTiles = new Set();
      this.deviceTiles.clear();

      const lampsOff = map.layers.find((layer) => layer.name === this.lampsOffLayerName);
      const flowersOff = map.layers.find((layer) => layer.name === this.flowersOffLayerName);
      if (!lampsOff || !flowersOff) {
        console.warn('[LightNetworkSystem] lamps_off / flowers_off not found on map');
        return;
      }

      for (const tile of lampsOff.tiles) this.lampTiles.add(this.k(tile.x, tile.y));
      for (const tile of flowersOff.tiles) this.deviceTiles.set(this.k(tile.x, tile.y), { x: tile.x, y: tile.y });

      this.buildLampClustersFromLampTiles();
      this.buildFlowerGroups();
    }

    buildLampClustersFromLampTiles() {
      this.lampClusters = [];
      const visited = new Set();
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const tiles = Array.from(this.lampTiles);
      let nextId = 1;

      for (const key of tiles) {
        if (visited.has(key)) continue;
        const { x: sx, y: sy } = this.parseKeyToXY(key);
        const queue = [{ x: sx, y: sy }];
        const clusterTiles = new Set();
        let minX = sx, minY = sy, maxX = sx, maxY = sy;

        while (queue.length) {
          const { x, y } = queue.shift();
          const currentKey = this.k(x, y);
          if (visited.has(currentKey) || !this.lampTiles.has(currentKey)) continue;
          visited.add(currentKey);
          clusterTiles.add(currentKey);
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;

          for (const [dx, dy] of dirs) {
            const nk = this.k(x + dx, y + dy);
            if (!visited.has(nk) && this.lampTiles.has(nk)) {
              queue.push({ x: x + dx, y: y + dy });
            }
          }
        }

        const bbox = { minX, minY, maxX, maxY };
        const reachable = this.computeReachableWiresFor(clusterTiles);
        this.lampClusters.push({ id: nextId++, tiles: clusterTiles, bbox, reachable, revealed: false });
      }

      for (const cluster of this.lampClusters) {
        const centerX = (cluster.bbox.minX + cluster.bbox.maxX + 1) * 0.5 * this.tileSize;
        const centerY = (cluster.bbox.minY + cluster.bbox.maxY + 1) * 0.5 * this.tileSize;
        const w = (cluster.bbox.maxX - cluster.bbox.minX + 1) * this.tileSize;
        const h = (cluster.bbox.maxY - cluster.bbox.minY + 1) * this.tileSize;
        const sensor = this.scene.physics.add.image(centerX, centerY, '__WHITE');
        sensor.setVisible(false).setAlpha(0).setActive(true);
        const body = sensor.body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(w, h);
        body.setOffset(-w / 2, -h / 2);
        cluster.sensor = sensor;
      }
    }

    computeReachableWiresFor(clusterTiles) {
      const starts = [];
      const seen = new Set();
      for (const key of clusterTiles) {
        const { x, y } = this.parseKeyToXY(key);
        const adjacent = [this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1)];
        for (const candidate of adjacent) {
          if (this.wiresSet.has(candidate) && !seen.has(candidate)) {
            seen.add(candidate);
            starts.push(candidate);
          }
        }
      }

      const reachable = new Set();
      const visited = new Set(starts);
      const queue = [...starts];
      while (queue.length) {
        const cur = queue.shift();
        reachable.add(cur);
        const { x, y } = this.parseKeyToXY(cur);
        const neighbors = [this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1)];
        for (const next of neighbors) {
          if (this.wiresSet.has(next) && !visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      return reachable;
    }

    buildFlowerGroups() {
      this.flowerGroups = [];
      const visited = new Set();
      const all = Array.from(this.deviceTiles.values());
      let gid = 1;

      for (const tile of all) {
        const key = this.k(tile.x, tile.y);
        if (visited.has(key)) continue;
        const tiles = this.collectContiguousFlowers(tile.x, tile.y, visited);
        if (!tiles.length) continue;

        const cx = (tiles.reduce((sum, item) => sum + item.x, 0) / tiles.length + 0.5) * this.tileSize;
        const cy = (tiles.reduce((sum, item) => sum + item.y, 0) / tiles.length + 0.5) * this.tileSize;
        const required = new Set();

        for (const cluster of this.lampClusters) {
          let touches = false;
          for (const flower of tiles) {
            const adjacent = [
              this.k(flower.x + 1, flower.y),
              this.k(flower.x - 1, flower.y),
              this.k(flower.x, flower.y + 1),
              this.k(flower.x, flower.y - 1)
            ];
            if (adjacent.some((a) => cluster.reachable.has(a))) {
              touches = true;
              break;
            }
          }
          if (touches) required.add(cluster.id);
        }

        this.flowerGroups.push({ id: gid++, tiles, required, cleared: false, center: { x: cx, y: cy } });
      }
    }

    revealLampCluster(cluster) {
      if (cluster.revealed) return;
      for (const key of cluster.tiles) {
        const { x, y } = this.parseKeyToXY(key);
        this.hideTileFromLayer(this.lampsOffLayerName, x, y);
      }
      cluster.revealed = true;
    }

    flashLampCluster(cluster) {
      const x = (cluster.bbox.minX + cluster.bbox.maxX + 1) * 0.5 * this.tileSize;
      const y = (cluster.bbox.minY + cluster.bbox.maxY + 1) * 0.5 * this.tileSize;
      const r = Math.max(cluster.bbox.maxX - cluster.bbox.minX + 1, cluster.bbox.maxY - cluster.bbox.minY + 1) * this.tileSize * 0.6;
      const circle = this.scene.add.circle(x, y, r, 0xffffaa, 0.6);
      circle.setBlendMode(Phaser.BlendModes.ADD).setDepth(1250);
      this.overlay.add(circle);
      this.scene.tweens.add({ targets: circle, alpha: 0, duration: 280, onComplete: () => circle.destroy() });
    }

    rippleAlongWireSet(wires) {
      const tiles = Array.from(wires).map((key) => this.parseKeyToXY(key));
      let idx = 0;
      const step = () => {
        const batch = tiles.slice(idx, idx + 20);
        idx += 20;
        for (const { x, y } of batch) {
          const cx = (x + 0.5) * this.tileSize;
          const cy = (y + 0.5) * this.tileSize;
          const pulse = this.scene.add.circle(cx, cy, this.tileSize * 0.35, 0x99ddff, 0.8);
          pulse.setBlendMode(Phaser.BlendModes.ADD).setDepth(1230);
          this.overlay.add(pulse);
          this.scene.tweens.add({ targets: pulse, alpha: 0, duration: 220, onComplete: () => pulse.destroy() });
        }
        if (idx < tiles.length) this.scene.time.delayedCall(60, step);
      };
      step();
    }

    tryTriggerMultiLampFlowers() {
      for (const group of this.flowerGroups) {
        if (group.cleared || !group.required.size) continue;
        let minT = Infinity;
        let maxT = -Infinity;
        for (const id of group.required) {
          const t = this.lampActivatedAt.get(id);
          if (t === undefined) {
            minT = Infinity;
            break;
          }
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
        }
        if (minT === Infinity) continue;
        if (maxT - minT <= this.simultaneousWindowMs) {
          for (const id of group.required) {
            const cluster = this.lampClusters.find((item) => item.id === id);
            if (cluster) this.revealLampCluster(cluster);
          }

          group.cleared = true;
          for (const tile of group.tiles) {
            const cx = (tile.x + 0.5) * this.tileSize;
            const cy = (tile.y + 0.5) * this.tileSize;
            const glow = this.scene.add.circle(cx, cy, this.tileSize * 0.45, 0xffffff, 0.95);
            glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(1260);
            this.overlay.add(glow);
            this.scene.tweens.add({ targets: glow, alpha: 0, duration: 380, onComplete: () => glow.destroy() });
            this.hideTileFromLayer(this.flowersOffLayerName, tile.x, tile.y);
          }
        }
      }
    }

    hideTileFromLayer(layerName, x, y) {
      let found = false;
      const centerX = x * this.tileSize + this.tileSize / 2;
      const centerY = y * this.tileSize + this.tileSize / 2;
      const targetName = `${layerName}:${x},${y}`;

      this.scene.children.list.forEach((obj) => {
        if (found) return;
        if (obj && obj.type === 'Container' && obj.name === layerName) {
          const list = obj.list || [];
          for (const child of list) {
            if (child?.name === targetName) {
              child.destroy?.();
              found = true;
              break;
            }
            if (typeof child?.x === 'number' && typeof child?.y === 'number') {
              if (Math.abs(child.x - centerX) < 0.5 && Math.abs(child.y - centerY) < 0.5) {
                child.destroy?.();
                found = true;
                break;
              }
            }
          }
        }
      });

      if (found) this.removeColliderAt(layerName, x, y);
    }

    collectContiguousFlowers(startX, startY, visited) {
      const result = [];
      const queue = [{ x: startX, y: startY }];
      while (queue.length) {
        const { x, y } = queue.shift();
        const key = this.k(x, y);
        if (visited.has(key)) continue;
        if (!this.deviceTiles.has(key)) continue;
        visited.add(key);
        result.push({ x, y });
        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
      }
      return result;
    }

    removeColliderAt(layerName, x, y) {
      const target = `collider:${layerName}:${x},${y}`;
      this.scene.children.list.forEach((obj) => {
        if (obj?.name === target) obj.destroy?.();
      });
      this.scene.children.list.forEach((obj) => {
        const layer = obj?.getData?.('layer');
        const tile = obj?.getData?.('tileXY');
        if (layer === layerName && tile && tile.x === x && tile.y === y) {
          obj.destroy?.();
        }
      });
    }

    parseKeyToXY(key) {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    }

    k(x, y) {
      return `${x},${y}`;
    }
  }

  class LightVillageDemoScene extends Phaser.Scene {
    constructor() {
      super('LightVillageDemoScene');
      this.resetRunState();
    }

    init() {
      this.resetRunState();
    }

    resetRunState() {
      this.playerInvulUntil = 0;
      this.playerFlickerTween = null;
      this.resetQueued = false;
      this.goalTriggered = false;
      this.hearts = { p1: 3, p2: 3 };
    }

    preload() {
      this.load.json('map:light-village-2', 'triends-demo-assets/maps/light-village-2/map.json');
      this.load.spritesheet('tiles:light-village-2', 'triends-demo-assets/maps/light-village-2/spritesheet.png', {
        frameWidth: 16,
        frameHeight: 16
      });
      this.load.spritesheet('player', 'triends-demo-assets/characters/astronaut_walking.png', {
        frameWidth: 64,
        frameHeight: 64
      });
      this.load.spritesheet('player_walking_mirror', 'triends-demo-assets/characters/astronaut_walking_mirror.png', {
        frameWidth: 64,
        frameHeight: 64
      });
      this.load.spritesheet('player_mirroring', 'triends-demo-assets/characters/astronaut_mirroring.png', {
        frameWidth: 64,
        frameHeight: 64
      });
      this.load.spritesheet('ginseng', 'triends-demo-assets/characters/ginseng_walking.png', {
        frameWidth: 48,
        frameHeight: 48
      });
      this.load.spritesheet('ginseng_sunflower', 'triends-demo-assets/gimmicks/sunflower.png', {
        frameWidth: 64,
        frameHeight: 64
      });
      this.load.spritesheet('sunflower_laser', 'triends-demo-assets/gimmicks/sunflower_laser.png', {
        frameWidth: 64,
        frameHeight: 64
      });
      this.load.spritesheet('thunder', 'triends-demo-assets/gimmicks/thunder6.png', {
        frameWidth: 256,
        frameHeight: 384
      });
      this.load.image('visigi', 'triends-demo-assets/npcs/visigi.png');
    }

    create() {
      const mapData = this.cache.json.get('map:light-village-2');
      if (!mapData) throw new Error('light-village-2 map did not load');

      this.mapManager = new MapManager(this);
      this.mapManager.load('map:light-village-2');
      const tileSize = this.mapManager.getTileSize();
      const spawn = tileToWorld(SPAWN_TILE.x, SPAWN_TILE.y, tileSize);

      this.player = new AstronautPlayer(this, spawn.x, spawn.y);
      this.player2 = new GinsengPlayer(this, spawn.x + tileSize * 2, spawn.y);
      this.mapManager.attachPlayer(this.player.sprite);
      this.mapManager.attachPlayer(this.player2.sprite);
      this.cameras.main.roundPixels = true;
      this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

      this.sunflowerLasers = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 24, runChildUpdate: false });
      this.player2.sprite.on('sunflower-shoot', (payload) => {
        this.spawnSunflowerLaser(payload.x, payload.y, payload.dir);
      });
      this.physics.add.overlap(this.player.sprite, this.sunflowerLasers, this.handleLaserVsMirror, undefined, this);

      this.lightSystem = new LightNetworkSystem(this, 'light-village-2', this.mapManager.getTilesTextureKey(), tileSize);
      this.lightSystem.attachLaserGroup(this.sunflowerLasers);

      const goal = tileToWorld(VISIGI_TILE.x, VISIGI_TILE.y, tileSize);
      this.visigi = this.physics.add.sprite(goal.x, goal.y, 'visigi');
      this.visigi.setImmovable(true);
      this.visigi.body.setAllowGravity(false);
      this.visigi.body.setSize(64, 64);
      this.visigi.setDepth(1000);
      this.visigiGlow = this.add.circle(goal.x, goal.y - 40, 48, 0xffffd5, 0.18).setDepth(980);
      this.tweens.add({ targets: this.visigiGlow, alpha: { from: 0.15, to: 0.35 }, duration: 900, yoyo: true, repeat: -1 });
      this.add.text(goal.x, goal.y - 94, 'Visigi', {
        fontSize: '22px',
        fontFamily: 'Inter, sans-serif',
        fontStyle: '700',
        color: '#7d5d35',
        backgroundColor: '#fffdfa',
        padding: { x: 10, y: 4 }
      }).setOrigin(0.5).setDepth(1001);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keysWASD = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      });
      this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

      this.input.keyboard.on('keydown', (evt) => {
        if (evt.code === 'ControlRight' || evt.code === 'MetaRight') {
          if (evt.repeat) return;
          this.player.setMirrorEquipped(!this.player.isMirrorEquipped);
        } else if (evt.code === 'Digit0' || evt.code === 'Numpad0') {
          if (evt.repeat) return;
          this.player.startMirroringPose(100);
        }
      });

      this.heartsText = this.add.text(18, 16, '', {
        fontSize: '28px',
        fontFamily: 'Inter, sans-serif',
        fontStyle: '700',
        color: '#9a7444',
        stroke: '#fffdfa',
        strokeThickness: 6
      }).setScrollFactor(0).setDepth(3000);

      this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 56, '', {
        fontSize: '22px',
        fontFamily: 'Inter, sans-serif',
        fontStyle: '600',
        color: '#1d1a16',
        backgroundColor: '#fffdfa',
        padding: { x: 16, y: 10 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

      this.showMessage('Reach Visigi. The run restarts on success or at 0 HP.');
      this.refreshHeartsUI();
    }

    update() {
      if (Phaser.Input.Keyboard.JustDown(this.rKey) && !this.resetQueued) {
        this.onTransformToggle();
      }

      if (!this.resetQueued) {
        this.player.update(this.cursors);
        this.player2.update(this.keysWASD);
      }

      this.checkGoal();
      this.checkLoseCondition();
      this.refreshHeartsUI();
    }

    onTransformToggle() {
      const p2 = this.player2.sprite;
      if (!p2) return;
      this.player2.lockMovement();
      const willBecomeSunflower = !this.player2.isSunflowerForm();
      this.triggerThunderAt(p2.x, p2.y, () => {
        if (!willBecomeSunflower) {
          this.player2.unlockMovement();
        }
      });
      this.time.delayedCall(350, () => {
        this.player2.toggleForm();
      });
    }

    triggerThunderAt(x, y, onComplete) {
      const sprite = this.add.sprite(x, y, 'thunder', 0);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(1500);
      sprite.play('thunder-strike');
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        sprite.destroy();
        if (onComplete) onComplete();
      });
    }

    spawnSunflowerLaser(x, y, dir, gen = 0) {
      const offset = { left: { dx: 0, dy: -32 }, right: { dx: 0, dy: -32 }, up: { dx: 0, dy: -32 }, down: { dx: 0, dy: -32 } };
      const sx = x + offset[dir].dx;
      const sy = y + offset[dir].dy;
      const laser = this.sunflowerLasers.get(sx, sy, 'sunflower_laser');
      if (!laser) return null;
      laser.setActive(true).setVisible(true);
      this.physics.world.enable(laser);
      const frameByDir = { down: 0, left: 1, right: 2, up: 3 };
      laser.setFrame(frameByDir[dir]);
      const body = laser.body;
      body.setAllowGravity(false);
      body.setSize(16, 16);
      body.setOffset((64 - 16) / 2, (64 - 16) / 2);
      if (dir === 'left') body.setVelocity(-LASER_SPEED, 0);
      else if (dir === 'right') body.setVelocity(LASER_SPEED, 0);
      else if (dir === 'up') body.setVelocity(0, -LASER_SPEED);
      else body.setVelocity(0, LASER_SPEED);
      laser.setData('dir', dir);
      laser.setData('gen', gen);
      laser.setDepth(1200);
      laser.setOrigin(0.5, 0.5);
      this.time.delayedCall(1000, () => {
        if (laser.active) laser.destroy();
      });
      return laser;
    }

    spawnSplitLaser(x, y, dir) {
      const laser = this.sunflowerLasers.get(x, y, 'sunflower_laser');
      if (!laser) return null;
      laser.setActive(true).setVisible(true);
      this.physics.world.enable(laser);
      const frameByDir = { down: 0, left: 1, right: 2, up: 3 };
      laser.setFrame(frameByDir[dir]);
      const body = laser.body;
      body.setAllowGravity(false);
      body.setSize(16, 16);
      body.setOffset((64 - 16) / 2, (64 - 16) / 2);
      if (dir === 'left') body.setVelocity(-LASER_SPEED, 0);
      else if (dir === 'right') body.setVelocity(LASER_SPEED, 0);
      else if (dir === 'up') body.setVelocity(0, -LASER_SPEED);
      else body.setVelocity(0, LASER_SPEED);
      laser.setData('dir', dir);
      laser.setData('gen', 1);
      laser.setDepth(1200);
      laser.setOrigin(0.5, 0.5);
      this.time.delayedCall(800, () => {
        if (laser.active) laser.destroy();
      });
      return laser;
    }

    oppositeDir(dir) {
      if (dir === 'left') return 'right';
      if (dir === 'right') return 'left';
      if (dir === 'up') return 'down';
      return 'up';
    }

    perpendicularDirs(dir) {
      return (dir === 'left' || dir === 'right') ? ['up', 'down'] : ['left', 'right'];
    }

    startPlayerFlicker(durationMs) {
      if (this.playerFlickerTween) this.playerFlickerTween.stop();
      this.player.sprite.setAlpha(1);
      this.playerFlickerTween = this.tweens.add({
        targets: this.player.sprite,
        alpha: { from: 1, to: 0.2 },
        duration: 80,
        yoyo: true,
        repeat: Math.ceil(durationMs / 80) * 2
      });
      this.time.delayedCall(durationMs, () => this.stopPlayerFlicker());
    }

    stopPlayerFlicker() {
      if (this.playerFlickerTween) {
        this.playerFlickerTween.stop();
        this.playerFlickerTween = null;
      }
      this.player.sprite.setAlpha(1);
    }

    handleLaserVsMirror(obj1, obj2) {
      const isLaser = (sprite) => sprite && sprite.texture?.key === 'sunflower_laser';
      const laser = isLaser(obj1) ? obj1 : (isLaser(obj2) ? obj2 : null);
      if (!laser || !laser.active) return;

      const curTexKey = this.player.sprite.texture?.key ?? '';
      const curAnimKey = this.player.sprite.anims?.currentAnim?.key ?? '';
      const isMirroringNow = curTexKey === 'player_mirroring' || curAnimKey.startsWith('player-mirroring-');

      if (!isMirroringNow) {
        if (laser.active) laser.destroy();
        if (this.time.now < this.playerInvulUntil) return;
        this.hearts.p1 = clamp(this.hearts.p1 - 1, 0, 3);
        this.playerInvulUntil = this.time.now + 1000;
        this.startPlayerFlicker(1000);
        if (this.hearts.p1 <= 0) {
          this.queueReset('HP 0 — restarting from the spawn.');
        } else {
          this.showMessage('The astronaut was hit. Mirror the beam to survive.');
        }
        return;
      }

      const gen = laser.getData('gen') ?? 0;
      if (gen >= 1) return;
      let dir = laser.getData('dir');
      if (!dir) {
        const body = laser.body;
        const vx = body?.velocity?.x ?? 0;
        const vy = body?.velocity?.y ?? 0;
        dir = Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'right' : 'left') : (vy >= 0 ? 'down' : 'up');
      }

      if (this.player.getLastDirection() !== this.oppositeDir(dir)) return;
      const lx = laser.x;
      const ly = laser.y;
      laser.destroy();
      const [d1, d2] = this.perpendicularDirs(dir);
      this.spawnSplitLaser(lx, ly, d1);
      this.spawnSplitLaser(lx, ly, d2);
    }

    checkGoal() {
      if (this.goalTriggered || this.resetQueued) return;
      const reachedByP1 = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.visigi.x, this.visigi.y) < 54;
      const reachedByP2 = Phaser.Math.Distance.Between(this.player2.sprite.x, this.player2.sprite.y, this.visigi.x, this.visigi.y) < 54;
      if (reachedByP1 || reachedByP2) {
        this.goalTriggered = true;
        this.queueReset('Reached Visigi! Restarting the demo...');
      }
    }

    checkLoseCondition() {
      if (this.resetQueued) return;
      if (this.hearts.p1 <= 0) {
        this.queueReset('HP 0 — restarting from the spawn.');
      }
    }

    queueReset(message) {
      if (this.resetQueued) return;
      this.resetQueued = true;
      this.player.sprite.body.stop();
      this.player2.sprite.body.stop();
      this.player.sprite.setVelocity(0, 0);
      this.player2.sprite.setVelocity(0, 0);
      this.showMessage(message);
      this.time.delayedCall(1200, () => this.scene.restart());
    }

    refreshHeartsUI() {
      this.heartsText.setText(`Astronaut HP ${'♥'.repeat(this.hearts.p1)}${'♡'.repeat(3 - this.hearts.p1)}   ·   Insam HP ${'♥'.repeat(this.hearts.p2)}${'♡'.repeat(3 - this.hearts.p2)}`);
    }

    showMessage(text) {
      this.messageText.setText(text);
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'triends-demo-game',
    transparent: true,
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [LightVillageDemoScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  window.addEventListener('load', () => {
    if (typeof Phaser === 'undefined') {
      console.error('Phaser failed to load for triends demo.');
      return;
    }
    window.triendsDemoGame = new Phaser.Game(config);
  });
})();
