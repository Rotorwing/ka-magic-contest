class Environment{
    constructor(scene){
        this.scene = scene;
        this.onLoad; // Callback to run when the assets are loaded
        this.sceneMesh; // All meshes loaded
        this.helpers; // All helper nodes loaded

        // Reflection probe for the sword (almost unnoticeable :P)
        this.swordProbe = new BABYLON.ReflectionProbe("sword", 512, scene);
        this.swordProbe.refreshRate = 3;

        this.animatedBouncers; // Objects that need the bouncing animation 
    }

    setOnLoad(callback){
        this.onLoad = callback;
    }

    addToScene = function() {
        // Load scene file from js
        BABYLON.SceneLoader.ImportMesh("", "", window.NatureRoomHDv7brokenUVs_converted, this.scene, this._onLoad.bind(this));

        // Original loader
        //BABYLON.SceneLoader.ImportMesh("", "../NatureRoom/glbs/", "NatureRoomHDv7(brokenUVs).glb", this.scene, this._onLoad.bind(this));
    }
    /**
     * private method called when the glb is loaded
     * @param {BABYLON.Mesh[]} meshes 
     */
    _onLoad(meshes){
        //console.log(meshes); // Debug: list all meshes Loaded

        // Get all invisible meshes and nodes that should not be rendered
        var invisibles = scene.getNodes().filter(obj => {
            if (!obj.parent) return false;
            return obj.parent.name == 'Invisibles'
        });
        this.sceneMesh = meshes; // Store all meshes
        this.helpers = invisibles; // Store all helper meshes

        // Make all helper meshes invisible
        for (const helper of this.helpers) {
            helper.visibility = false;
        }
        // Add all the meshes to the sword reflection probe
        for (const mesh of meshes){
            this.swordProbe.renderList.push(mesh);
        }

        // Add the floating stones to the animation list
        this.animatedBouncers = scene.meshes.filter(obj => {
            return (obj.name.includes('stone')) && obj.name.length == 6;
        });
        // Assign some random parameters to the bounce animation
        for(const stone of this.animatedBouncers){
            console.log(stone);
            stone.time = Math.random()*10; // Set the start time of the animation to stagger the animations
            stone.speed = Math.random()*0.8; // Set the speed that then animation plays
            stone.distance = Math.random()*0.2; // Set how far the rock moves
            stone.originalPosition = stone.position; // Save its original position for future reference
        }
        // Add the sword to the list of animated objects
        this.animatedBouncers.push(scene.getNodes().filter(obj => {
            return 'Sword' == obj.name
        })[0]);

        // Set the animation parameters for the sword
        const sword = this.animatedBouncers[this.animatedBouncers.length-1];
        sword.time = 0;
        sword.speed = 0.4;
        sword.distance = 0.1;
        sword.originalPosition = sword.position;
        

        // Get the sword's blade and its texture to add the reflection probe to 
        const bladeTex = scene.materials.filter(obj => {
            return 'Textured_Blade' == obj.name
        })[0];
        const bladeMesh = scene.meshes.filter(obj => {
            return 'Blade.001' == obj.name
        })[0];
        this.swordProbe.attachToMesh(bladeMesh); // Attach the reflection probe to the sword blade

        // Use the reflection probe on the blade's texture
        bladeTex.metallic = 0.9;
        bladeTex.roughness = 0.0;
        bladeTex.reflectionTexture = this.swordProbe.cubeTexture;
        
        // Call the external callback if one was given
        if (this.onLoad) this.onLoad(this.sceneMesh, this.helpers);
    }
    /**
     * Update all animated objects
     */
    update(){
        const deltaTime = engine.getDeltaTime(); // Get the change in time since the last frame

        // Check that the animated objects have been added
        if(this.animatedBouncers){
            for (const stone of this.animatedBouncers) {
                // Set the shift the object vertically to be the sine of the elapsed time times the distance
                const yShift = Math.sin(stone.time)*stone.distance; 
                stone.position = stone.originalPosition.add(new BABYLON.Vector3(0, yShift, 0)); // Update the object's position 
                stone.time+=deltaTime*stone.speed*0.001; // Increment the time in seconds times the animation speed
            }
        }
    }
}