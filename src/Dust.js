class Dust{
    constructor (scene){

        // Set constants used for the particles
        this.particleBox;
        this.particleScale = 0.03;
        this.particleAlpha = 0.7;
        this.particleSpeed = 0.1;

        // Create the particles system
        this.particles = new BABYLON.ParticleSystem("dust", 2000, scene);
        //base64ToFile(window.dust_converted).then((e)=>{this.create(e).bind(this)});
    // }
    // create(){
        this.particles.particleTexture = new BABYLON.Texture(window.dust_converted);
        this.particles.emitter = new BABYLON.Vector3(0, 0.5, 0);
        this.particles.direction1 = new BABYLON.Vector3(0, 0, 0);
        this.particles.direction2 = new BABYLON.Vector3(0, 0, 0);

        // Set how long each particle lasts
        this.particles.minLifeTime = 5;
        this.particles.maxLifeTime = 10;

        this.particles.emitRate = 250;

        // Create a noise texture to make the particles float around
        this.noiseTexture = new BABYLON.NoiseProceduralTexture("perlin", 256, scene);
        this.noiseTexture.animationSpeedFactor = 1;
        this.noiseTexture.persistence = 2;
        this.noiseTexture.brightness = 0.5;
        this.noiseTexture.octaves = 2;
        
        // Make the particle move with the noise texture
        this.particles.noiseTexture = this.noiseTexture;
        this.particles.noiseStrength = new BABYLON.Vector3(this.particleSpeed, this.particleSpeed, this.particleSpeed);

        // Make the particles fade in and out through their life
        this.particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        this.particles.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0))
        this.particles.addColorGradient(0.25, new BABYLON.Color4(1, 1, 1, 0.75*this.particleAlpha))
        this.particles.addColorGradient(0.5, new BABYLON.Color4(1, 1, 1, 1*this.particleAlpha))
        this.particles.addColorGradient(0.75, new BABYLON.Color4(1, 1, 1, 0.75*this.particleAlpha))
        this.particles.addColorGradient(1, new BABYLON.Color4(1, 1, 1, 0))

        this.particles.addSizeGradient(0, 0);
        this.particles.addSizeGradient(0.75, this.particleScale);
        this.particles.addSizeGradient(1, 0);

        
    }

    start (){
        this.particles.start();
    }

    stop (){
        this.particles.stop();
    }

    getPositions (){
        const positions = [];
        for (particle in this.particles.particles){
            positions.push(particle.position);
        }
        return positions;
    }
    setBox(mesh){
        // Set the box the particles will be spawned in
        this.particleBox = mesh;
        const boundingBox = this.particleBox.getBoundingInfo().boundingBox;
        //this.particleBox.visibility = true;
        this.particles.createBoxEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0), boundingBox.minimumWorld, boundingBox.maximumWorld);
    }
}

async function base64ToFile(dataURL) {
    return (fetch(dataURL)
        .then(function (result) {
            return result.arrayBuffer();
        }));
}