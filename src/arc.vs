const shader = `precision mediump float;

attribute vec2 aPrevPosition;
attribute vec2 aCurrPosition;
attribute vec2 aNextPosition;
attribute float aOffset;

uniform sampler2D uAreaColorTex;
uniform float uAreaColorTexRes;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;

uniform vec4 uColor;
uniform float uWidth;
uniform int uMiter;

varying vec4 vColor;

void main(void)
{
  mat3 model = projectionMatrix * translationMatrix;

  // Render line
  vColor = vec4(uColor.rgb, 1.0);

  vec4 prevGlPos = vec4((model * vec3(aPrevPosition, 1.0)).xy, 0.0, 1.0);
  vec4 currGlPos = vec4((model * vec3(aCurrPosition, 1.0)).xy, 0.0, 1.0);
  vec4 nextGlPos = vec4((model * vec3(aNextPosition, 1.0)).xy, 0.0, 1.0);

  // Calculate the direction
  vec2 dir = vec2(0.0);

  if (currGlPos == prevGlPos) {
    // start point uses (next - current)
    dir = normalize(nextGlPos.xy - currGlPos.xy);
  }
  else if (currGlPos == nextGlPos) {
    // end point uses (current - previous)
    dir = normalize(currGlPos.xy - prevGlPos.xy);
  }
  else {
    // somewhere in middle, needs a join:
    // get directions from (C - B) and (B - A)
    vec2 dirA = normalize((currGlPos.xy - prevGlPos.xy));
    if (uMiter == 1) {
      vec2 dirB = normalize((nextGlPos.xy - currGlPos.xy));
      // now compute the miter join normal and length
      vec2 tangent = normalize(dirA + dirB);
      vec2 perp = vec2(-dirA.y, dirA.x);
      vec2 miter = vec2(-tangent.y, tangent.x);
      dir = tangent;
    } else {
      dir = dirA;
    }
  }

  float width = (projectionMatrix * vec3(uWidth, 0.0, 0.0)).x / 2.0;

  vec2 normal = vec2(-dir.y, dir.x) * width;
  // normal.x /= aspectRatio;
  vec4 offset = vec4(normal * aOffset, 0.0, 0.0);
  gl_Position = currGlPos + offset;
}
`;

export default shader;
