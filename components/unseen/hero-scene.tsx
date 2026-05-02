"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type OrbitNode = {
  line: THREE.Line;
  mesh: THREE.Mesh;
  particle: THREE.Mesh;
  radius: number;
  speed: number;
};

const ORBIT_CONFIG = [
  { color: 0x7b2fff, radius: 3.0, speed: 0.008 },
  { color: 0x9333ea, radius: 3.8, speed: 0.006 },
  { color: 0xa855f7, radius: 4.5, speed: 0.004 },
  { color: 0x6d28d9, radius: 2.5, speed: 0.01 },
];

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 2, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const centralMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4a1a8c,
      emissive: 0x7b2fff,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const shieldNode = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      centralMaterial,
    );
    scene.add(shieldNode);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xa855f7,
        emissiveIntensity: 2,
      }),
    );
    scene.add(core);

    const ambient = new THREE.AmbientLight(0x2d1060, 0.5);
    const pointPrimary = new THREE.PointLight(0xa855f7, 3, 20);
    pointPrimary.position.set(0, 2, 0);
    const pointFill = new THREE.PointLight(0x7b2fff, 1.5, 15);
    pointFill.position.set(3, -1, 3);

    scene.add(ambient, pointPrimary, pointFill);

    const grid = new THREE.GridHelper(20, 20, 0x7b2fff, 0x2d1060);
    grid.position.y = -2.5;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.3;
    scene.add(grid);

    const orbitNodes: OrbitNode[] = ORBIT_CONFIG.map((config) => {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25, 0),
        new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: config.color,
          emissiveIntensity: 0.55,
          metalness: 0.75,
          roughness: 0.2,
        }),
      );
      scene.add(mesh);

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);

      const line = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: 0xa855f7,
          transparent: true,
          opacity: 0.3,
        }),
      );
      scene.add(line);

      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xf0ecff,
        }),
      );
      scene.add(particle);

      return {
        mesh,
        line,
        particle,
        radius: config.radius,
        speed: prefersReducedMotion ? config.speed * 0.2 : config.speed,
      };
    });

    const mouse = new THREE.Vector2(0, 0);

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onResize = () => {
      if (!containerRef.current) {
        return;
      }

      const { clientHeight, clientWidth } = containerRef.current;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    let animationFrame = 0;

    const renderLoop = (time: number) => {
      const orbitTime = time * 0.12;

      if (!prefersReducedMotion) {
        shieldNode.rotation.y += 0.003;
        shieldNode.rotation.x += 0.001;
        core.rotation.y -= 0.004;
      }

      orbitNodes.forEach((node, index) => {
        const x = Math.cos(orbitTime * node.speed) * node.radius;
        const z = Math.sin(orbitTime * node.speed) * node.radius;
        const y = Math.sin(orbitTime * node.speed * 0.5) * 0.5;

        node.mesh.position.set(x, y, z);

        if (!prefersReducedMotion) {
          node.mesh.rotation.x += 0.014 + index * 0.002;
          node.mesh.rotation.y += 0.011 + index * 0.002;
        }

        const positions = (node.line.geometry.attributes.position
          .array as Float32Array);
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = 0;
        positions[3] = x;
        positions[4] = y;
        positions[5] = z;
        node.line.geometry.attributes.position.needsUpdate = true;

        const pulse = (Math.sin(orbitTime * 0.002 + index) + 1) * 0.5;
        node.particle.position.set(x * pulse, y * pulse, z * pulse);
      });

      const targetX = prefersReducedMotion ? 0 : mouse.x * 1.5;
      const targetY = prefersReducedMotion ? 1.6 : mouse.y * 0.8 + 1;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(renderLoop);
    };

    animationFrame = window.requestAnimationFrame(renderLoop);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      shieldNode.geometry.dispose();
      centralMaterial.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      orbitNodes.forEach((node) => {
        node.mesh.geometry.dispose();
        (node.mesh.material as THREE.Material).dispose();
        node.particle.geometry.dispose();
        (node.particle.material as THREE.Material).dispose();
        node.line.geometry.dispose();
        (node.line.material as THREE.Material).dispose();
      });
      grid.geometry.dispose();
    };
  }, []);

  return <div className="hero-scene" ref={containerRef} />;
}
