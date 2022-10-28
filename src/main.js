/**
 * @param {import("babylonjs")}
 */
const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
const scene = new BABYLON.Scene(engine);
const createScene = function () {

    // Make the the background white
    scene.clearColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    
    // Create the camera
    const camera = new UserCamera(scene);
    camera.position = new BABYLON.Vector3(-3.66, 1.86, 1.75); // Set a default position for the camera
    camera.target = new BABYLON.Vector3(0.6, 2.5, 0); // Set the point that the camera looks at
    camera.update(); // Update variables
    camera.fov = Math.PI*0.3; // Set Camera fov
    
    // Create the sun (used for main lighting and passed to volume shader)
    const sun = new Sun(scene);
    sun.setIntensity(0.9);
    sun.setPosition(new BABYLON.Vector3(5, 5, -15)) // Set default position
    sun.setColor(new BABYLON.Color3(1.0, 1.0, 0.9)) // Tint the sun slightly yellow
    //sun.showHelper(); // Show the location of the sun

    // light to illuminate the center of the scene while keeping edges dark;
    const falloffLight = new BABYLON.PointLight("falloff", new BABYLON.Vector3.Zero(), scene);
    falloffLight.diffuse = new BABYLON.Color3(0.9, 1.0, 0.9) // Tint slightly blue, this will help the shadows contrast the sun
    falloffLight.intensity = 10.0; // The brightness of the light


    const scattering = new Scattering(scene, camera, sun.light); // Create the volume scattering pipeline
    const dust = new Dust(scene); // Create the dust particle system

    // Load in the scene
    const environment = new Environment(scene);
    environment.addToScene();

    // Things to do once the meshes are loaded
    environment.setOnLoad(((meshes, helpers)=>{
        for (const mesh of meshes) { // Modify loaded meshes
            if(mesh in helpers) continue; // Ignore helper meshes (they will be invisible anyway)
            mesh.receiveShadows = true; // Allow the mesh to receive a cast shadow
            scattering.addShadowMesh(mesh); // Pass the mesh to the volume pipeline
            console.log(mesh.name); // Debug: list names of meshes
        }
        // Setup particles
        dust.setBox(getNode('ParticleBox')); // Grab the mesh that particles will spawn in
        if (window.useParticles) dust.start(); // Start the particle emitter if it is turned on

        // Setup Camera
        camera.setCameraBox(getNode('CameraBox')); // Grab the mesh that the camera is restricted to

        // Setup Sun
        sun.setPosition(getNode('SunPosition').getAbsolutePosition()); // Update the sun to be at the place given in the glb
        sun.setTarget(new BABYLON.Vector3.Zero()); // Point the sun at the center of the scene

        falloffLight.position = getNode('FalloffLightPosition').getAbsolutePosition(); // Update the falloff light to be at the place given

        window.doneLoading(); // Signal that everything is loaded and ready to have the loading scene removed
    }).bind(this));

    // Rendering pipeline to add fx such as bloom and anti-aliasing
    var defaultPipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera]);
    defaultPipeline.bloomEnabled = window.useBloom;
    defaultPipeline.fxaaEnabled = window.useAntiAliasing;
    defaultPipeline.bloomWeight = 0.5;
    defaultPipeline.cameraFov = camera.fov;

    // Execute after the rendering pipeline is done
    scene.registerAfterRender(() =>{
        environment.update(); // Update scene animations
    });
    

    //scattering.previewDepthPass(); // Debug: Show shadow depth map

    /*
    // Debug: Used to preview any texture 
    BABYLON.Effect.ShadersStore['depthbufferPixelShader'] =
    "#ifdef GL_ES\nprecision highp float;\n#endif\n\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\n\nvoid main(void)\n{\nvec4 depth = texture2D(textureSampler, vUV);\ngl_FragColor = vec4(depth.r, depth.r, depth.r, 1.0);\n}";

    //alert(test + '\n\n' + BABYLON.Effect.ShadersStore['depthbufferPixelShader']);

    var post_process = new BABYLON.PostProcess('depth_display', 'depthbuffer', null, null, 1.0, null, null, engine, true);
    //post_process.activate(camera, this.depth_renderer.getDepthMap());
    post_process.onApply = function (effect) {
        effect._bindTexture("textureSampler", scattering.shadowGenerator.getShadowMap().getInternalTexture());//scattering.noiseTexture.getInternalTexture());//
    }.bind(this);
    camera.attachPostProcess(post_process);
    */
    
    // Execute the volume shader pipeline
    if(window.useVolumeShaders) scattering.calculateScattering();
    
    return scene;
};

const sceneOut = createScene(); // Call the createScene function
// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    sceneOut.render();
});
// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
    sceneOut.resize();
});

// Gets a node (meshes, emptys, lights, etc) form the scene
function getNode(name){
    var results = scene.getNodes().filter(obj => {
        return obj.name == name
    });
    return results[0];
}