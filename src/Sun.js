class Sun{
    /**
     * 
     * @param {BABYLON.Scene} scene 
     */
    constructor(scene){
        // Set basic attributes of the sun
        this.position = new BABYLON.Vector3(0, -1, 0);
        this.target = new BABYLON.Vector3(0, 0 , 0);
        this.light = new BABYLON.DirectionalLight("sun", this.getDirection(), scene);
        
        // Create a helper (sphere) that can be shown for debugging
        this.helper = BABYLON.MeshBuilder.CreateSphere("helper", {diameter: 2, segments: 16}, scene);
        this.helper.position.copyFrom(this.position);
        
        // Make the helper white and invisible by default
        this.helper.visibility = false;
        this.helperMat = new BABYLON.StandardMaterial("helper", scene);
        this.helperMat.diffuseColor = new BABYLON.Color3.White;
        this.helper.material = this.helperMat;

        // Shadows from the sun will only be cast in this range (needed to generate a depth buffer)
        this.light.shadowMaxZ = 50;
        this.light.shadowMinZ = 0;
    }

    /**
     * Return the direction the sun is shining
     * @return {BABYLON.Vector3}
     */
    getDirection (){
        return this.target.subtract(this.position).clone();
    }
    /**
     * Returns the position of the sun
     * @return {BABYLON.Vector3}
     */
    getPosition (){
        return this.position;
    }
    /**
     * return the point that the sun is "looking" at
     * @return {BABYLON.Vector3}
     */
    getTarget () {
        return this.target;
    }
    /**
     * Set the position of the sun
     * @param {BABYLON.Vector3} position 
     */
    setPosition (position){
        console.log(this.light.position.x, this.light.position.y, this.light.position.z)
        console.log(this.light.direction.x, this.light.direction.y, this.light.direction.z)
        this.position.copyFrom(position);
        this.updateLight();
        console.log(this.light.position.x, this.light.position.y, this.light.position.z)
        console.log(this.light.direction.x, this.light.direction.y, this.light.direction.z)
    }
    /**
     * Set the point that the sun is "looking" at
     * @param {BABYLON.Vector3} position 
     */
    setTarget (position){
        this.target.copyFrom(position);
        this.updateLight();
    }
    /**
     * Update the actual light after being modified
     */
    updateLight (){
        this.light.direction.copyFrom(this.getDirection());
        this.light.position.copyFrom(this.position);
        this.helper.position.copyFrom(this.position);
    }
    /**
     * Set the brightness of the sun
     * @param {float} intensity 
     */
    setIntensity (intensity){
        this.light.intensity = intensity;
    }
    /**
     * Set the color of the sun
     * @param {BABYLON.Color3} color 
     */
    setColor (color){
        this.light.diffuse = color;
        this.helperMat.diffuseColor = color;
    }

    showHelper () {this.helper.visibility = true;}
    hideHelper () {this.helper.visibility = false;}

    /**
     * Create a shadow generator for the sun
     * @return {BABYLON.ShadowGenerator}
     */
    getShadowGenerator (){
        return new BABYLON.ShadowGenerator(1024, this.light);
    }
}