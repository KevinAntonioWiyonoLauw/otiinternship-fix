import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 colorRamp(vec3 colors[3], float factor) {
  int index = 0;
  for (int i = 0; i < 2; i++) {
    float position = float(i) * 0.5;
    if (position <= factor) {
      index = i;
    }
  }
  vec3 currentColor = colors[index];
  vec3 nextColor = colors[index + 1];
  float position = float(index) * 0.5;
  float nextPosition = float(index + 1) * 0.5;
  float range = nextPosition - position;
  float lerpFactor = (factor - position) / range;
  return mix(currentColor, nextColor, lerpFactor);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  vec3 rampColor = colorRamp(uColorStops, uv.x);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime, uTime * 0.5)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
  colorStops?: [string, string, string];
  amplitude?: number;
  blend?: number;
  speed?: number;
}

export default function Aurora(props: AuroraProps) {
  const {
    colorStops = ["#3A29FF", "#FF94B4", "#FF3232"],
    amplitude = 1.0,
    blend = 0.5,
    speed = 1.0
  } = props;
  const propsRef = useRef<AuroraProps>(props);
  propsRef.current = props;

  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    let program: Program | undefined;

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    }
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete (geometry.attributes as any).uv;
    }

    const initialColorStops = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    try {
      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: amplitude },
          uColorStops: { value: initialColorStops },
          uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
          uBlend: { value: blend },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });
      ctn.appendChild(gl.canvas);

      let startTime = performance.now();
      let animateId = 0;
      
      const update = () => {
        if (!program) return;
        animateId = requestAnimationFrame(update);
        
        const currentTime = (performance.now() - startTime) * 0.001;
        const currentSpeed = propsRef.current.speed ?? speed;
        const currentAmplitude = propsRef.current.amplitude ?? amplitude;
        const currentBlend = propsRef.current.blend ?? blend;
        const currentColorStops = propsRef.current.colorStops ?? colorStops;
        
        program.uniforms.uTime.value = currentTime * currentSpeed;
        program.uniforms.uAmplitude.value = currentAmplitude;
        program.uniforms.uBlend.value = currentBlend;
        
        const stops = currentColorStops.map((hex: string) => {
          const c = new Color(hex);
          return [c.r, c.g, c.b];
        });
        program.uniforms.uColorStops.value = stops;
        
        renderer.render({ scene: mesh });
      };
      
      animateId = requestAnimationFrame(update);
      resize();

      return () => {
        cancelAnimationFrame(animateId);
        window.removeEventListener("resize", resize);
        if (ctn && gl.canvas.parentNode === ctn) {
          ctn.removeChild(gl.canvas);
        }
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch (error) {
      console.error("Error initializing WebGL:", error);
      return () => {};
    }
  }, []); // Empty dependency array since we're using propsRef for updates

  return <div ref={ctnDom} className="w-full h-full" />;
} 