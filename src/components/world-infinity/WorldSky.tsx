/**
 * WorldSky — gradient sky dome, directional sun light, and a starfield for
 * night/dusk worlds. Sun angle + intensity come from the time-of-day preset.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Stars } from "@react-three/drei";
import type { ArchetypeDef, TimeOfDay } from "@/lib/worldInfinity/types";
import { TIME_OF_DAY } from "@/lib/worldInfinity/biomes";

export function WorldSky({
  archetype,
  timeOfDay,
}: {
  archetype: ArchetypeDef;
  timeOfDay: TimeOfDay;
}) {
  const tod = TIME_OF_DAY[timeOfDay];
  const isDark = timeOfDay === "night" || timeOfDay === "dusk";

  const skyUniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(archetype.palette.skyTop) },
      bottom: { value: new THREE.Color(archetype.palette.skyBottom) },
      offset: { value: 0.0 },
      exponent: { value: 0.7 },
    }),
    [archetype.palette.skyTop, archetype.palette.skyBottom],
  );

  // Sun position derived from time-of-day angle.
  const sunAngle = (tod.sunAngle + 0.2) * Math.PI; // arc across the sky
  const sunPos: [number, number, number] = [
    Math.cos(sunAngle) * 60,
    Math.sin(sunAngle) * 50 + 8,
    Math.sin(sunAngle * 1.3) * 40,
  ];

  return (
    <>
      <mesh scale={[-1, 1, 1]}>
        {/* Large sphere centred on the camera */}
        <sphereGeometry args={[400, 32, 16]} />
        <shaderMaterial
          uniforms={skyUniforms}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sun disc */}
      <mesh position={sunPos}>
        <sphereGeometry args={[6, 24, 24]} />
        <meshBasicMaterial color={archetype.palette.sun} />
      </mesh>

      <directionalLight
        position={sunPos}
        intensity={tod.sunIntensity}
        color={archetype.palette.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <ambientLight intensity={tod.ambient} color={archetype.palette.fog} />
      <hemisphereLight
        intensity={0.35}
        color={archetype.palette.skyBottom}
        groundColor={archetype.palette.ground}
      />

      {isDark && (
        <Stars radius={200} depth={60} count={1800} factor={4} saturation={0.5} fade speed={0.3} />
      )}
    </>
  );
}

const SKY_VERT = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = `
  uniform vec3 top;
  uniform vec3 bottom;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + offset).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
    vec3 col = mix(bottom, top, t);
    gl_FragColor = vec4(col, 1.0);
  }
`;
