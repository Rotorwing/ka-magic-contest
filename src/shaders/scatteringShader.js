window.scatteringFragmentShader = `
#ifdef GL_ES
    precision highp float;
#endif

// Get all inputs
varying vec2 vUV;
uniform sampler2D cameraDepthTexture;
uniform sampler2D shadowDepthTexture;
uniform sampler2D textureSampler;
uniform sampler2D lightIntensity;

#define PI 3.14159265359
uniform float G_SCATTERING;

uniform vec2 screenSize;
uniform vec2 shadowMapSize;
uniform float nearClip;
uniform float farClip;
uniform float aspect;
uniform float tanFov;

uniform vec3 lightPosition;
uniform vec3 lightDirection;
uniform float shadowNearClip;
uniform float shadowFarClip;

uniform vec3 lightColor;

uniform mat4 cameraTransformMatrix;
uniform mat4 cameraProjectMatrix;
uniform mat4 cameraViewMatrix;
uniform mat4 shadowMatrix;
uniform mat4 dither;

uniform float depthPassResolution;

/**
 * Given a texture coordinate and a distance return the point in 3D camera space 
 */
vec4 toCameraSpace(vec2 p, float d){
    float z_ndc = 2.0 * d - 1.0;
    //float z_eye = 2.0 * nearClip * farClip / (farClip + nearClip - z_ndc * (farClip - nearClip));
    float z_eye = (nearClip + (d*1.0) * (farClip - nearClip));

    vec2 p_ndc = vec2(p.x*2.0-1.0, p.y*2.0-1.0);

    vec3 viewPos = vec3(0.0);
    viewPos.x = z_eye * p_ndc.x * aspect * tanFov;
    viewPos.y = z_eye * p_ndc.y * tanFov;
    viewPos.z = -z_eye;
    vec4 cameraSpace = vec4(viewPos.xy, z_eye, 1.0);
    return cameraSpace;
}
/*
 * Given a point in camera space return the point in world space
 */
vec3 cameraTo3D(vec2 p, float d){
    vec4 cameraSpace = toCameraSpace(p, d);
    vec4 worldSpace = cameraViewMatrix*cameraSpace;
    // float realDepth =d * (farClip - nearClip) + nearClip;
    // vec4 cameraSpace = cameraProjectMatrix*vec4(p_ndc, 1.0, 1.0);
    // //cameraSpace.z = realDepth;
    // vec4 worldSpace = cameraSpace*cameraViewMatrix;
    return vec3(worldSpace);
}
/*
 * Given a 3D point returns the texture coordinate of it projected onto the shadow map
 */
vec2 projectToShadowMap(vec3 p){
    return vec2(shadowMatrix*vec4(p, 1.0));
}
/*
 * Converts the depth value of the depth buffer to a real-world distance
 */
float realShadowDepth(float d){
    return d*(shadowFarClip-shadowNearClip)+shadowNearClip;
}
/*
 * Gives the repeating sequence of numbers 0 through <count> 
 */
float modStep(float value, float count){
    return mod(floor(value), count);
}
/*
 * Divides the screen into 4x4 chunks containing values relative x-y coordinate
 */
vec2 modPixels(vec2 p){
    return vec2(modStep(p.x*screenSize.x, 4.0), modStep(p.y*screenSize.y, 4.0));
}
/*
 * Computes scattering using a Henyey-Greenstein Phase Function
 */
float ComputeScattering(float lightDotView)
{
    float result = 1.0/(4.0*PI);
    result *= (1.0-G_SCATTERING * G_SCATTERING)/(pow(1.0+G_SCATTERING * G_SCATTERING-2.0*G_SCATTERING*lightDotView, 1.5f));
    return result;
}


void main(void) {
    vec3 cameraDepth = texture2D(cameraDepthTexture, vUV).rgb; // Get the depth data at the voxel
    //vec3 baseTexture = texture2D(textureSampler, vUV).rgb;

    float deltaT = depthPassResolution; // How far each step along the ray should be
    float ditherScale = 1.0; // How much the dither effects the staring ray position

    // Compute the dither
    vec2 ditherIndex = modPixels(vUV*ditherScale);
    float ditherValue = deltaT*dither[int(ditherIndex.x)][int(ditherIndex.y)];

    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Start with the fragment color being black

    vec2 shadowTexTransform = vec2(0.5, 0.5); // Transform used to center the shadow map

    //if (cameraDepth.r  < 1.0){ // Optional: Do not scatter rays that do not hit a mesh
        // Step along the ray and compute scattering at each point
        for(float d = ditherValue; d < cameraDepth.r; d+=deltaT){ // Comment to Debug: bypass stepping to project only on surfaces
            //float d = cameraDepth.r;
            vec3 reconstruct = cameraTo3D(vUV.xy, d); // Convert the fragment coordinate to world coordinates
            vec2 shadowCoord = projectToShadowMap(reconstruct); // Convert the world point to a texture coordinate on the shadow map
            vec3 shadow = texture2D(shadowDepthTexture, shadowCoord*shadowTexTransform+shadowTexTransform).rgb; // Get the shadow map depth at the projected coordinate
            float intensity = texture2D(lightIntensity, shadowCoord*shadowTexTransform+shadowTexTransform).r; // Use the animated noise texture to add fluctuations
            float shadowDepth = realShadowDepth(shadow.r); // Get the depth of the ray from the light to the point
            float reconstructDepth = length(lightPosition) - dot(reconstruct, lightPosition)/length(lightPosition); // convert the depth to world scale
            bool isHit = shadowDepth > reconstructDepth-0.01; // Check if the ray from the light hits the point
            if(isHit){
                gl_FragColor += vec4(vec3(deltaT), intensity); // Increment the depth that represents distance traveled through lit space
            }
            
        }
    //}
    vec3 cameraRay = cameraTo3D(vUV.xy, 1.0); // Get the direction vector of the camera ray
    float lightDotView = dot(normalize(-lightDirection), normalize(cameraRay)); // compute the angle between the ray and the sun
    float scattering = ComputeScattering(lightDotView); // Compute the amount of back-scattering along the ray
    scattering *= 5.5; // Scale scattering
    float density = 50.0; // Density of the dust (Future project: Make it use a voxel simulation to make moving fog?)
    float transmittance = exp(-gl_FragColor.r*density); // Calculate the transmittance
    float scaledIntensity = gl_FragColor.a*0.2+0.8; // Calculate the amount that the noise texture changes the intensity
    gl_FragColor = vec4(lightColor*scattering*scaledIntensity, 1.0-transmittance);  // Combine it all together to get the color of the fragment
}
`