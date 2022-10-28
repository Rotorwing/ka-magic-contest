class UserCamera extends BABYLON.ArcRotateCamera {
    /**
     * Camera that is bounded to be inside a mesh
     * @param {BABYLON.Scene} scene 
     */
    constructor(scene){
        // Run the parent constructor
        super("camera1", 0, Math.PI / 2, 100, new BABYLON.Vector3(0, 0, 0), scene);
        this.scene = scene;

        this.setTarget(BABYLON.Vector3.Zero());
        this.attachControl(canvas, true);

        // This targets the camera to scene origin
        this.setTarget(BABYLON.Vector3.Zero());
        
        this.maxZ = 50; // Max render distance (required for depth buffer)
        this.cameraBox;
        
        this.radiusRay = new BABYLON.Ray(); // The ray used to check how far the restriction box is from the camera target
        
        this.lowerRadiusLimit = 1.5; // How close the camera can get to it's target

        // Variables used to track where the camera should be
        this.zoomedOut = true;
        this.desiredRadius = this.radius;
        this.previousRadius = this.radius;
    }
    /**
     * Set the camera restriction box
     * @param {BABYLON.Mesh} mesh 
     */
    setCameraBox(mesh){
        this.cameraBox = mesh;
    }
    /**
     * Automatically called by the super class when the camera is moved
     */
    update(){
        super.update(); // Run the supper class version

        this.zoomAmount = this.radius-this.previousRadius; // Get the attempted motion from the user

         // Prevent the user from zooming out if the camera is hitting the restriction box
        if (this.zoomedOut) this.zoomAmount = Math.min(this.zoomAmount, 0);
        this.desiredRadius += this.zoomAmount; // Update the desired motion

        // Check that a restriction box has been loaded in
        if(this.cameraBox){
            // Set the ray to point from the camera's target to the current location of the camera
            this.radiusRay.origin = this.target;
            this.radiusRay.direction = this.position.subtract(this.target);
            this.radiusRay.length = 15;

            // Cast the ray to see how far back the camera can go
            let maxPosition = this.scene.pickWithRay(this.radiusRay, (mesh)=>{return mesh.name == this.cameraBox.name});//this.radiusRay.intersectsMesh(this.cameraBox);

            // The camera can go back slightly farther than the ray because of clipping
            this.upperRadiusLimit = maxPosition.distance+0.5;
            this.radius = Math.min(this.desiredRadius, this.upperRadiusLimit);

            // Check if the camera is hitting the restriction box
            if(this.radius == this.upperRadiusLimit) this.zoomedOut = true;
            else this.zoomedOut = false;
        }
        this.previousRadius = this.radius;
    }

}