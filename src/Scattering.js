class Scattering{
    /**
     * A volume scattering pipeline
     * Creates a overlay image of the scattered light from a given light source.
     * 
     * @param {BABYLON.Scene} scene 
     * @param {BABYLON.Camera} camera
     * @param {BABYLON.Light} light
     */
    constructor(scene, camera, light){

        this.scene = scene;
        this.camera = camera;

        this.depth_renderer = scene.enableDepthRenderer(); // Create a depth renderer (This is a supper fast way of doing "ray casting")
        this.maxDepth = camera.maxZ; // Get the max depth the camera will render (this will show up white in the depth map)

        //this.lightSources = [];
        this.shadowMapSize = 1024*window.shadowMapResolutionScale; // Create the shadow map (This acts as a depth map from the suns point of view)
        this.lightSource = light;
        this.shadowGenerator = new BABYLON.ShadowGenerator(this.shadowMapSize, this.lightSource); // Crete the pipeline to create the shadow map
        this.shadowGenerator.bias=0.001; // Add some bias (helps reduce glitches)
        this.shadowGenerator.usePoissonSampling = true; // Makes shadow maps smoother
        this.rebuildShadowMeshes(); // Make sure that all visible meshes are added to the shadow pipeline
        this.shadowMatrix = this.shadowGenerator.getTransformMatrix(); // Get the matrix the converts a point in 3d space to 2d point texture coordinate

        // Create a noise texture pipeline (used to make fluctuating light beams)
        this.noiseTexture = new BABYLON.NoiseProceduralTexture("perlin", 256, scene);
        this.noiseTexture.octaves = 6;
        this.noiseTexture.persistence = 1.75;
        this.noiseTexture.animationSpeedFactor = 0.5;

        this.registerShaders(); // Load shaders as a js strings since KH doesn't like file with strange extensions :(
        
    }

    addShadowMesh (mesh){
        this.shadowGenerator.addShadowCaster(mesh);
    }
    rebuildShadowMeshes (){
        this.shadowGenerator.getShadowMap().renderList = [];

        for (const mesh of scene.meshes) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }

    getDepthTexture (){
        return this.depth_renderer.getDepthMap().getInternalTexture();
    }

    /**
     * Debug: displays the depth pass from the sun
     */
    previewDepthPass (){
        BABYLON.Effect.ShadersStore['depthbufferPixelShader'] =
        "#ifdef GL_ES\nprecision highp float;\n#endif\n\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\n\nvoid main(void)\n{\nvec4 depth = texture2D(textureSampler, vUV);\ngl_FragColor = vec4(depth.r, depth.r, depth.r, 1.0);\n}";
        BABYLON.Effect.RegisterShader("scattering", "")
        //alert(test + '\n\n' + BABYLON.Effect.ShadersStore['depthbufferPixelShader']);

        var post_process = new BABYLON.PostProcess('depth_display', 'depthbuffer', null, null, 1.0, null, null, engine, true);
        //post_process.activate(camera, this.depth_renderer.getDepthMap());
        post_process.onApply = function(effect) {
            //console.log(this.depth_renderer)
            effect._bindTexture("textureSampler", this.depth_renderer.getDepthMap().getInternalTexture());
        }.bind(this);
        camera.attachPostProcess(post_process);
    }
    /**
     * This is the method that does the heavy lifting
     * Generates a overlay of the scattered light using a GPU shader
     */
    calculateScattering(){
        // Create the GPU process that will compute the scattering texture
        const scatteringProcess = new BABYLON.PostProcess('scatteringProcess', 'scattering',
                                                  ["screenSize", "shadowMapSize", "nearClip", "farClip", "aspect", "tanFov", "cameraViewMatrix", "cameraTransformMatrix", "cameraProjectMatrix", 
                                                  "shadowMatrix", "lightPosition", "shadowNearClip", "shadowFarClip", "lightDirection", "dither", "G_SCATTERING", "lightColor", "depthPassResolution"],
                                                  ["cameraDepthTexture", "shadowDepthTexture", "lightIntensity"], 1.0, this.camera, null, engine, true);

        
        // When the renderer is ready to compute the shader, collect all the needed information to pass to the shader
        scatteringProcess.onApply = function (effect) {
            
            // Compute some basic stuff on the CPU to let the GPU do more productive stuff
            const tanFov = Math.tan(this.camera.fov * 0.5);
            const aspect = engine.getRenderWidth()/engine.getRenderHeight();

            // Get projection matrixes
            const inverseViewM = new BABYLON.Matrix();
            const inverseTransformM = new BABYLON.Matrix();
            const inverseProjectM = new BABYLON.Matrix();
            this.camera.getViewMatrix().invertToRef(inverseViewM);
            this.camera.getTransformationMatrix().invertToRef(inverseTransformM);
            this.camera.getProjectionMatrix().invertToRef(inverseProjectM);
            
            // Pass in information about the camera a screen
            effect.setFloat2("screenSize", scatteringProcess.width, scatteringProcess.height);
            effect.setFloat2("shadowMapSize", this.shadowMapSize, this.shadowMapSize);
            effect.setFloat("nearClip", this.camera.minZ);
            effect.setFloat("farClip", this.camera.maxZ);
            effect.setFloat("aspect", aspect);
            effect.setFloat("tanFov", tanFov);

            // Pass in the shadow projection matrix
            effect.setMatrix("shadowMatrix", this.shadowGenerator.getTransformMatrix());

            // Pas in the camera projection matrixes
            effect.setMatrix("cameraViewMatrix", inverseViewM);
            effect.setMatrix("cameraTransformMatrix", inverseTransformM);
            effect.setMatrix("cameraProjectMatrix", inverseProjectM);

            // Pass in information about the light source
            effect.setVector3("lightPosition", this.lightSource.position);
            effect.setVector3("lightDirection", this.lightSource.direction);
            effect.setFloat("shadowNearClip", this.lightSource.shadowMinZ);
            effect.setFloat("shadowFarClip", this.lightSource.shadowMaxZ);
            effect.setVector3("lightColor", new BABYLON.Vector3(this.lightSource.diffuse.r, this.lightSource.diffuse.g, this.lightSource.diffuse.b));
            
            // Pass in the depth buffers
            effect.setTexture("cameraDepthTexture", this.depth_renderer.getDepthMap());
            effect.setTexture("shadowDepthTexture", this.shadowGenerator.getShadowMap());
            effect.setTexture("lightIntensity", this.noiseTexture);

            effect.setFloat("G_SCATTERING", 0.2); // Set the scattering (how much the light gets reflected away from the direction of travel)

            // Pass in a matrix to help average out inaccuracies 
            effect.setMatrix("dither", new BABYLON.Matrix.FromArray(
                [0.0, 0.5, 0.125, 0.625, 0.75, 0.22, 0.875, 0.375, 0.1875, 0.6875, 0.0625, 0.5625, 0.9375, 0.4375, 0.8125, 0.3125]
                ));
            
            // Set the resolution of each depth pass
            effect.setFloat("depthPassResolution", window.depthPassResolution);
        }.bind(this);

        this.camera.attachPostProcess(scatteringProcess); // Enable the shader

        // Blur out the graininess caused by the dither
        var kernel = 9.0;
        var postProcessBlur1 = new BABYLON.BlurPostProcess("Horizontal blur", new BABYLON.Vector2(1.0, 0), kernel, 1.0, this.camera);
        var postProcessBlur2 = new BABYLON.BlurPostProcess("Vertical blur", new BABYLON.Vector2(0, 1.0), kernel, 1.0, this.camera);

        // Layer the scattering texture with the normal render
        const mergeProcess = new BABYLON.PostProcess('scatteringProcess', 'alphaOver', [],
                                                  ["baseTexture", "overTexture"], 1.0, this.camera, null, engine, true);

        mergeProcess.onApply = function (effect) {
            effect.setTextureFromPostProcess("baseTexture", scatteringProcess);
            effect.setTextureFromPostProcess("overTexture", mergeProcess);
        }.bind(this);

        this.camera.attachPostProcess(mergeProcess); // Enable the merge process
    }

    /**
     * Set the light source used for light beams
     * @param {BABYLON.DirectionalLight} light 
     */
    setLightSource(light){
        this.lightSource = light;
    }
    /**
     * Loads in required shaders from js files
     */
    registerShaders(){
        BABYLON.Effect.ShadersStore["scatteringFragmentShader"] = window.scatteringFragmentShader;
        BABYLON.Effect.ShadersStore["alphaOverFragmentShader"] = window.alphaOverFragmentShader;
    }

    
}