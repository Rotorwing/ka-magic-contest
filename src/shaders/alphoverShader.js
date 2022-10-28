window.alphaOverFragmentShader = `
#ifdef GL_ES
    precision highp float;
#endif

varying vec2 vUV;
uniform sampler2D overTexture;
uniform sampler2D baseTexture;


void main(void) {
    vec4 baseColor = texture2D(baseTexture, vUV);
    vec4 overColor = texture2D(overTexture, vUV);
    gl_FragColor = vec4(baseColor.rgb+overColor.rgb*overColor.a, 1.0);
}
`