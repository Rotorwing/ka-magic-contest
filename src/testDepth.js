const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
var createScene = function () {

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera("camera1", 0, 1, 15, new BABYLON.Vector3(0, 0, 0), scene);
	camera.maxZ = 100;

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.DirectionalLight("light1", new BABYLON.Vector3(0, -1, 0), scene);
        //new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

	

    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", 
        {diameter: 2, segments: 32}, scene);
    // Move the sphere upward 1/2 its height
    sphere.position.y = 1;
    // Built-in 'ground' shape.
    const ground = BABYLON.MeshBuilder.CreateGround("ground", 
        {width: 6, height: 6}, scene);
	
	
	
	// RENDER DEPTH
	
	var depth_renderer = scene.enableDepthRenderer();
    depth_renderer.forceDepthWriteTransparentMeshes = true;
	//scene.disableDepthRenderer();
	var display_depth = false;


	BABYLON.Effect.ShadersStore['depthbufferPixelShader'] =
	"#ifdef GL_ES\nprecision highp float;\n#endif\n\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\n\nvoid main(void)\n{\nvec4 depth = texture2D(textureSampler, vUV);\ngl_FragColor = vec4(depth.r, depth.r, depth.r, 1.0);\n}";

	//alert(test + '\n\n' + BABYLON.Effect.ShadersStore['depthbufferPixelShader']);

	var post_process = new BABYLON.PostProcess('depth_display', 'depthbuffer', null, null, 1.0, null, null, engine, true);
	//post_process.activate(camera, depth_renderer.getDepthMap());
	post_process.onApply = function(effect) {
		effect._bindTexture("textureSampler", depth_renderer.getDepthMap().getInternalTexture());
	}
	
	camera.attachPostProcess(post_process);
	// switch normal render & depth render with space press
    return scene;

};
const scene = createScene(); //Call the createScene function
// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
        scene.render();
});
// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
        engine.resize();
});