import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox, Line } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { resources as featuredResources, type Res } from "@/lib/data";

export type ComputeSceneProps = {
  landing?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  paused?: boolean;
  resetKey?: number;
  exploded?: boolean;
  sceneResources?: Res[];
};
type Palette = Record<
  "base" | "panel" | "edge" | "text" | "lime" | "cyan" | "amber" | "ground" | "grid",
  string
>;

function labelTexture(resource: Res, p: Palette) {
  const canvas = document.createElement("canvas");
  const S = 0.5;
  canvas.width = 1024 * S;
  canvas.height = 1280 * S;
  const c = canvas.getContext("2d");
  if (c) {
    c.scale(S, S);
    c.fillStyle = p.panel;
    c.fillRect(0, 0, 1024, 1280);
    c.fillStyle = p.lime;
    c.fillRect(64, 48, 120, 14);
    c.fillStyle = p.lime;
    c.font = "bold 100px ui-monospace, Menlo, monospace";
    c.textBaseline = "alphabetic";
    const words = resource.name.split("-");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line}-${word}` : word;
      if (c.measureText(next).width > 896) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, i) => c.fillText(text, 64, 170 + i * 110));
    c.fillStyle = p.edge;
    c.fillRect(64, 440, 896, 6);
    c.fillStyle = p.text;
    c.font = "bold 60px ui-monospace, Menlo, monospace";
    c.fillText(resource.region, 64, 540);
    c.font = "bold 52px ui-monospace, Menlo, monospace";
    c.fillText("CO₂e / MONTH", 64, 680);
    c.font = "bold 150px ui-monospace, Menlo, monospace";
    c.fillText(`${resource.carbon} kg`, 64, 850);
    c.fillStyle = resource.risk === "High" ? p.amber : p.lime;
    c.font = "bold 60px ui-monospace, Menlo, monospace";
    c.fillText(`${resource.confidence}% confidence`, 64, 1030);
    c.font = "bold 54px ui-monospace, Menlo, monospace";
    c.fillText(`Waste: ${resource.waste}/100`, 64, 1140);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function ResourceModule({
  resource,
  index,
  selected,
  onSelect,
  p,
  exploded,
  columns,
}: {
  resource: Res;
  index: number;
  columns: number;
  selected?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  p: Palette;
  exploded?: boolean | undefined;
}) {
  const ref = useRef<THREE.Group>(null);
  const texture = useMemo(() => labelTexture(resource, p), [resource, p]);
  useEffect(() => () => texture.dispose(), [texture]);
  const active = selected === resource.id;
  const spacing = columns === 5 ? 1.3 : 1.42;
  const x = ((index % columns) - (columns - 1) / 2) * spacing;
  const z = (Math.floor(index / columns) - 0.5) * 1.8;
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = active ? 0.45 : exploded ? Math.floor(index / columns) * 0.7 + 0.1 : 0;
    ref.current.position.y = THREE.MathUtils.damp(
      ref.current.position.y,
      target,
      5,
      Math.min(delta, 0.05),
    );
  });
  return (
    <group
      ref={ref}
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(resource.id);
      }}
    >
      <RoundedBox
        args={[1.23, 1.7, 1.38]}
        radius={0.06}
        smoothness={2}
        position-y={1.02}
        castShadow
      >
        <meshStandardMaterial color={active ? p.edge : p.base} metalness={0.3} roughness={0.58} />
      </RoundedBox>
      <mesh position={[0, 1.04, 0.698]}>
        <planeGeometry args={[1.08, 1.42]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.04, -0.698]} rotation-y={Math.PI}>
        <planeGeometry args={[1.08, 1.42]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[1.1, 0.045, 1.22]} />
        <meshStandardMaterial color={active ? p.lime : p.edge} metalness={0.25} roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3].map((n) => (
        <mesh key={n} position={[0.623, 0.5 + n * 0.32, 0]}>
          <boxGeometry args={[0.012, 0.035, 1.05]} />
          <meshStandardMaterial color={p.edge} />
        </mesh>
      ))}
      <mesh position={[-0.47, 1.72, 0.712]}>
        <boxGeometry args={[0.13, 0.035, 0.02]} />
        <meshBasicMaterial color={active ? p.lime : p.cyan} />
      </mesh>
    </group>
  );
}

function Topology({
  p,
  landing,
  selected,
  onSelect,
  paused,
  exploded,
  sceneResources,
}: ComputeSceneProps & { p: Palette }) {
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  const flow = useRef<THREE.Mesh>(null);
  const resourcesToRender = sceneResources ?? featuredResources;
  const columns = resourcesToRender.length > 8 ? 5 : 4;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const c = canvas.getContext("2d");
    if (c) {
      c.fillStyle = p.ground;
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = p.grid;
      c.lineWidth = 1;
      for (let i = 0; i < 256; i += 32) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, 256);
        c.moveTo(0, i);
        c.lineTo(256, i);
        c.stroke();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 5);
    return t;
  }, [p]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    if (paused) return;
    const frameDelta = Math.min(delta, 0.05);
    time.current += frameDelta;
    if (group.current) {
      if (landing) group.current.rotation.y = Math.sin(time.current * 0.15) * 0.15;
      else group.current.rotation.y += frameDelta * 0.2;
    }
    if (flow.current) flow.current.position.x = Math.sin(time.current * 0.8) * 3.8;
  });
  return (
    <group ref={group}>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.15} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      <RoundedBox
        args={[6.6, 0.18, 4.5]}
        radius={0.05}
        smoothness={2}
        position-y={-0.03}
        receiveShadow
      >
        <meshStandardMaterial color={p.panel} roughness={0.72} metalness={0.15} />
      </RoundedBox>
      {resourcesToRender.map((r, i) => (
        <ResourceModule
          key={r.id}
          resource={r}
          index={i}
          columns={columns}
          selected={selected}
          onSelect={onSelect}
          p={p}
          exploded={exploded}
        />
      ))}
      {[-2.45, 2.45].map((z) => (
        <Line
          key={z}
          points={[
            [-5, -0.02, z],
            [-3.7, -0.02, z],
            [-3.7, -0.02, 0],
            [-3.3, -0.02, 0],
          ]}
          color={p.lime}
          lineWidth={1.5}
        />
      ))}
      <Line
        points={[
          [-4, -0.01, 2.8],
          [4, -0.01, 2.8],
          [4, -0.01, 0],
          [3.3, -0.01, 0],
        ]}
        color={p.cyan}
        lineWidth={1}
      />
      <mesh ref={flow} position={[0, 0.01, 2.8]}>
        <boxGeometry args={[0.25, 0.025, 0.06]} />
        <meshBasicMaterial color={p.lime} />
      </mesh>
    </group>
  );
}

export default function ComputeScene(props: ComputeSceneProps) {
  const [palette, setPalette] = useState<Palette>();
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const keys = [
      "base",
      "panel",
      "edge",
      "text",
      "lime",
      "cyan",
      "amber",
      "ground",
      "grid",
    ] as const;
    setPalette(
      Object.fromEntries(
        keys.map((key) => [key, css.getPropertyValue(`--scene-${key}`).trim()]),
      ) as Palette,
    );
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { rootMargin: "100px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  if (!palette) return <div className="scene-loading">Preparing infrastructure…</div>;
  return (
    <Canvas
      ref={canvasRef}
      key={props.resetKey}
      frameloop={visible ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{
        position: props.landing ? [8, 6.5, 9] : [1.8, 3.8, 8.2],
        fov: props.landing ? 40 : 37,
      }}
      gl={{ antialias: false, alpha: true }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(palette.ground);
      }}
      fallback={
        <div className="scene-loading">
          3D is unavailable on this device. Resource data remains available below.
        </div>
      }
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 8, 5]} intensity={1.65} />
      <Suspense fallback={null}>
        <Environment resolution={32}>
          <Lightformer
            intensity={1.5}
            position={[0, 6, 0]}
            rotation-x={Math.PI / 2}
            scale={[10, 10, 1]}
          />
          <Lightformer
            intensity={0.85}
            color={palette.cyan}
            position={[-5, 3, 0]}
            rotation-y={Math.PI / 2}
            scale={[6, 6, 1]}
          />
        </Environment>
        <Topology {...props} paused={props.paused || reduced} p={palette} />
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={!props.landing}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={0.4}
        maxPolarAngle={1.3}
        target={[0, 0.65, 0]}
        autoRotate={!props.paused && !reduced}
        autoRotateSpeed={0.45}
      />
    </Canvas>
  );
}
