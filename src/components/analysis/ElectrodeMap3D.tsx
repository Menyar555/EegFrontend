import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MTLLoader, OBJLoader } from 'three-stdlib';
import { Brain, Eye, EyeOff, Layers, Thermometer } from 'lucide-react';

interface ElectrodePosition {
  x: number;
  y: number;
  z: number;
}

interface ElectrodeData {
  name: string;
  position: number[];
  voltage: number;
  isOriginal: boolean;
  region: string;
}

interface ElectrodeMap3DProps {
  data: {
    electrodes: boolean;
    patientConfig?: {
      interpolationTarget?: number;
    };
    electrodeData?: ElectrodeData[];
    selectedInterval?: {
      start: number;
      end: number;
    };
  };
}

const ELECTRODE_POSITIONS_10_20: Record<string, ElectrodePosition> = {
  Fp1: { x: -0.35, y: 0.8, z: 0.15 },
  Fp2: { x: 0.35, y: 0.8, z: 0.15 },
  F3: { x: -0.45, y: 0.7, z: 0.55 },
  F4: { x: 0.45, y: 0.7, z: 0.55 },
  Fz: { x: 0, y: 0.85, z: 0.6 },
  T7: { x: -0.8, y: 0.6, z: -0.1 },
  C3: { x: -0.5, y: 0.7, z: 0.35 },
  Cz: { x: 0, y: 0.8, z: 0.4 },
  C4: { x: 0.5, y: 0.7, z: 0.35 },
  T8: { x: 0.8, y: 0.6, z: -0.1 },
  P3: { x: -0.45, y: 0.6, z: -0.5 },
  Pz: { x: 0, y: 0.75, z: -0.6 },
  P4: { x: 0.45, y: 0.6, z: -0.5 },
  O1: { x: -0.35, y: 0.5, z: -0.75 },
  Oz: { x: 0, y: 0.6, z: -0.8 },
  O2: { x: 0.35, y: 0.5, z: -0.75 },
};

const generateInterpolatedElectrodePositions = (targetCount: number = 16): Record<string, ElectrodePosition> => {
  const basePositions = { ...ELECTRODE_POSITIONS_10_20 };
  if (targetCount <= 16) return basePositions;
  
  const additionalElectrodes32 = {
    AF3: { x: -0.3, y: 0.75, z: 0.3 },
    AF4: { x: 0.3, y: 0.75, z: 0.3 },
    FC1: { x: -0.35, y: 0.65, z: 0.45 },
    FC2: { x: 0.35, y: 0.65, z: 0.45 },
    CP1: { x: -0.35, y: 0.55, z: -0.45 },
    CP2: { x: 0.35, y: 0.55, z: -0.45 },
    PO3: { x: -0.4, y: 0.45, z: -0.6 },
    PO4: { x: 0.4, y: 0.45, z: -0.6 },
  };
  
  const additionalElectrodes64 = {
    ...additionalElectrodes32,
    F5: { x: -0.55, y: 0.65, z: 0.5 },
    F6: { x: 0.55, y: 0.65, z: 0.5 },
    C5: { x: -0.6, y: 0.6, z: 0.2 },
    C6: { x: 0.6, y: 0.6, z: 0.2 },
    P5: { x: -0.5, y: 0.5, z: -0.5 },
    P6: { x: 0.5, y: 0.5, z: -0.5 },
    F1: { x: -0.25, y: 0.75, z: 0.5 },
    F2: { x: 0.25, y: 0.75, z: 0.5 },
    FC3: { x: -0.45, y: 0.6, z: 0.4 },
    FC4: { x: 0.45, y: 0.6, z: 0.4 },
    CP3: { x: -0.4, y: 0.5, z: -0.4 },
    CP4: { x: 0.4, y: 0.5, z: -0.4 },
    P1: { x: -0.25, y: 0.55, z: -0.5 },
    P2: { x: 0.25, y: 0.55, z: -0.5 },
    PO5: { x: -0.3, y: 0.4, z: -0.7 },
    PO6: { x: 0.3, y: 0.4, z: -0.7 },
    FT7: { x: -0.75, y: 0.65, z: 0.1 },
    FT8: { x: 0.75, y: 0.65, z: 0.1 },
    TP7: { x: -0.75, y: 0.5, z: -0.3 },
    TP8: { x: 0.75, y: 0.5, z: -0.3 },
  };
  
  if (targetCount >= 32) {
    const additionalElectrodes = targetCount >= 64 ? additionalElectrodes64 : additionalElectrodes32;
    return { ...basePositions, ...additionalElectrodes };
  }
  return basePositions;
};

// Fonction pour déterminer la région d'une électrode
const getElectrodeRegion = (name: string): string => {
  if (name.startsWith('F') || name.startsWith('AF')) return 'Frontal';
  if (name.startsWith('C') || name.startsWith('FC') || name.startsWith('CP')) return 'Central';
  if (name.startsWith('P') || name.startsWith('PO')) return 'Pariétal';
  if (name.startsWith('O')) return 'Occipital';
  if (name.startsWith('T')) return 'Temporal';
  return 'Autre';
};

// Vertex shader pour le heatmap
const brainVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader pour le heatmap
const brainFragmentShader = `
  uniform sampler2D uHeatmapTexture;
  uniform float uOpacity;
  uniform float uHeatmapIntensity;
  uniform bool uShowHeatmap;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 baseColor = vec3(0.9, 0.9, 0.9); // Couleur de base du cerveau
    
    if (uShowHeatmap) {
      // Échantillonner la texture du heatmap
      vec4 heatmapColor = texture2D(uHeatmapTexture, vUv);
      
      // Mélanger la couleur de base avec la couleur du heatmap
      vec3 finalColor = mix(baseColor, heatmapColor.rgb, uHeatmapIntensity * heatmapColor.a);
      
      // Appliquer un éclairage simple
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.2));
      float diff = max(dot(vNormal, lightDir), 0.0);
      vec3 diffuse = diff * finalColor;
      
      // Ajouter une composante ambiante
      vec3 ambient = 0.3 * finalColor;
      
      vec3 result = ambient + diffuse;
      
      gl_FragColor = vec4(result, uOpacity);
    } else {
      // Mode normal sans heatmap
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.2));
      float diff = max(dot(vNormal, lightDir), 0.0);
      vec3 diffuse = diff * baseColor;
      vec3 ambient = 0.3 * baseColor;
      vec3 result = ambient + diffuse;
      
      gl_FragColor = vec4(result, uOpacity);
    }
  }
`;

// Composant pour l'électrode avec coordonnées et voltage
const Electrode: React.FC<{
  position: number[];
  name: string;
  voltage: number;
  isVisible: boolean;
  showLabels: boolean;
  showCoordinates: boolean;
  isOriginal: boolean;
  region: string;
}> = ({ position, name, voltage, isVisible, showLabels, showCoordinates, isOriginal, region }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (labelRef.current && (showLabels || showCoordinates)) {
      labelRef.current.lookAt(state.camera.position);
    }
  });
  
  if (!isVisible) return null;
  
  // Normaliser le voltage pour la couleur (0-100 µV)
  const normalizedVoltage = Math.min(Math.max(voltage / 100, 0), 1);
  
  // Déterminer la couleur en fonction du voltage
  // Rouge pour les valeurs élevées, bleu pour les valeurs faibles
  const hue = (1 - normalizedVoltage) * 240; // De bleu (240) à rouge (0)
  const color = new THREE.Color().setHSL(hue / 360, 0.9, 0.5);
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isOriginal ? 0.03 : 0.025, 16, 16]} />
        <meshPhongMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.3} 
          shininess={100} 
        />
      </mesh>
      
      {(showLabels || showCoordinates) && (
        <group ref={labelRef}>
          <Html position={[0, 0.1, 0]} center>
            <div className="text-white px-2 py-2 rounded-md text-xs whitespace-nowrap pointer-events-none shadow-md border backdrop-blur-sm bg-gray-800/90 border-gray-300/50">
              {showLabels && (
                <>
                  <div className="font-bold text-center text-white text-[10px]">{name}</div>
                  <div className="text-center font-semibold text-[8px] text-yellow-200">
                    {voltage.toFixed(1)}µV
                  </div>
                  <div className="text-center text-[7px] text-blue-200">
                    {region}
                  </div>
                </>
              )}
              {showCoordinates && (
                <div className="mt-1 text-center text-[7px] text-green-200">
                  ({position[0].toFixed(2)}, {position[1].toFixed(2)}, {position[2].toFixed(2)})
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};

// Fonction pour créer une texture de heatmap à partir des points 3D
const createBrainHeatmapTexture = (electrodeData: ElectrodeData[], width: number = 512, height: number = 512): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Unable to get 2D context');
    return new THREE.Texture();
  }
  
  // Remplir le fond avec une couleur transparente
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, width, height);
  
  // Créer une grille pour l'interpolation
  const gridSize = 4;
  const gridWidth = Math.ceil(width / gridSize);
  const gridHeight = Math.ceil(height / gridSize);
  const grid: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));
  const gridWeights: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));
  
  // Projeter les positions 3D sur la sphère et mapper aux coordonnées UV
  electrodeData.forEach(electrode => {
    // Normaliser la position
    const vector = new THREE.Vector3(electrode.position[0], electrode.position[1], electrode.position[2]);
    vector.normalize();
    
    // Convertir en coordonnées sphériques
    const phi = Math.acos(-vector.y);
    const theta = Math.atan2(vector.z, vector.x);
    
    // Convertir en coordonnées UV
    const u = (theta + Math.PI) / (2 * Math.PI);
    const v = phi / Math.PI;
    
    // Mapper à la grille
    const gridX = Math.floor(u * gridWidth);
    const gridY = Math.floor(v * gridHeight);
    
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      grid[gridY][gridX] += electrode.voltage;
      gridWeights[gridY][gridX] += 1;
    }
  });
  
  // Calculer la moyenne pour chaque cellule de la grille
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (gridWeights[y][x] > 0) {
        grid[y][x] /= gridWeights[y][x];
      }
    }
  }
  
  // Interpolation bilinéaire pour remplir les trous
  const interpolatedGrid = [...grid.map(row => [...row])];
  
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (gridWeights[y][x] === 0) {
        // Trouver les cellules voisines non vides
        let sum = 0;
        let count = 0;
        const radius = 5;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < gridHeight && nx >= 0 && nx < gridWidth && gridWeights[ny][nx] > 0) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              sum += grid[ny][nx] / (distance * distance);
              count += 1 / (distance * distance);
            }
          }
        }
        
        if (count > 0) {
          interpolatedGrid[y][x] = sum / count;
        }
      }
    }
  }
  
  // Appliquer un filtre gaussien pour lisser le heatmap
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  const kernelSum = 16;
  
  const smoothedGrid = [...interpolatedGrid.map(row => [...row])];
  
  for (let y = 1; y < gridHeight - 1; y++) {
    for (let x = 1; x < gridWidth - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += interpolatedGrid[y + ky][x + kx] * kernel[ky + 1][kx + 1];
        }
      }
      smoothedGrid[y][x] = sum / kernelSum;
    }
  }
  
  // Normaliser les valeurs pour la couleur
  const maxVoltage = Math.max(...smoothedGrid.flat());
  const minVoltage = Math.min(...smoothedGrid.flat());
  const range = maxVoltage - minVoltage || 1;
  
  // Dessiner le heatmap sur le canvas
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const voltage = smoothedGrid[y][x];
      
      if (voltage > 0) {
        // Normaliser le voltage pour la couleur
        const normalizedVoltage = (voltage - minVoltage) / range;
        
        // Déterminer la couleur en fonction du voltage
        const hue = (1 - normalizedVoltage) * 240; // De bleu (240) à rouge (0)
        const saturation = 0.8;
        const lightness = 0.5;
        
        // Convertir HSL en RGB
        const h = hue / 360;
        const s = saturation;
        const l = lightness;
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        const r = Math.max(0, Math.min(1, 
          h + 1/3 < 0 ? q + (q - p) * 6 * h :
          h < 0 ? p :
          h < 1/3 ? p + (q - p) * 6 * h :
          h < 2/3 ? q :
          p + (q - p) * 6 * (h - 2/3)
        ));
        
        const g = Math.max(0, Math.min(1,
          h + 1/3 < 1/3 ? h + 1/3 :
          h < 2/3 ? q :
          h + 1/3 < 0 ? p :
          h < 2/3 ? p + (q - p) * 6 * (h - 1/3) :
          q
        ));
        
        const b = Math.max(0, Math.min(1,
          h < 1/3 ? p :
          h < 2/3 ? q :
          h + 1/3 < 0 ? p :
          h < 2/3 ? q + (q - p) * 6 * (h - 2/3) :
          p + (q - p) * 6 * (h - 5/3)
        ));
        
        // Définir l'alpha en fonction de la valeur du voltage
        const alpha = Math.min(0.9, normalizedVoltage * 1.5);
        
        ctx.fillStyle = `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, ${alpha})`;
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
    }
  }
  
  // Créer une texture à partir du canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
};

// Composant pour le modèle du cerveau avec heatmap
const Brain3D: React.FC<{
  electrodeCount: number;
  opacity: number;
  showElectrodes: boolean;
  showLabels: boolean;
  showCoordinates: boolean;
  showHeatmap: boolean;
  heatmapIntensity: number;
  data: ElectrodeMap3DProps['data'];
}> = ({ electrodeCount, opacity, showElectrodes, showLabels, showCoordinates, showHeatmap, heatmapIntensity, data }) => {
  const [brainModel, setBrainModel] = useState<THREE.Group | null>(null);
  const [heatmapTexture, setHeatmapTexture] = useState<THREE.Texture | null>(null);
  const [brainMaterial, setBrainMaterial] = useState<THREE.ShaderMaterial | null>(null);
  
  useEffect(() => {
    // Charger le modèle du cerveau
    const mtlLoader = new MTLLoader();
    const objLoader = new OBJLoader();
    
    mtlLoader.load('/models/brain.mtl', (materials) => {
      materials.preload();
      objLoader.setMaterials(materials);
      objLoader.load('/models/brain.obj', (object) => {
        object.position.set(0, 0, 0);
        object.scale.set(1.2, 1.2, 1.2);
        object.rotation.set(0, Math.PI, 0);
        
        setBrainModel(object);
      });
    });
  }, []);
  
  // Créer une texture pour le heatmap
  useEffect(() => {
    if (showHeatmap && data.electrodeData && data.electrodeData.length > 0) {
      const texture = createBrainHeatmapTexture(data.electrodeData);
      setHeatmapTexture(texture);
    } else {
      setHeatmapTexture(null);
    }
  }, [showHeatmap, data.electrodeData]);
  
  // Créer le matériau personnalisé pour le cerveau
  useEffect(() => {
    if (brainModel && heatmapTexture) {
      // Créer un matériau avec shader
      const material = new THREE.ShaderMaterial({
        vertexShader: brainVertexShader,
        fragmentShader: brainFragmentShader,
        uniforms: {
          uHeatmapTexture: { value: heatmapTexture },
          uOpacity: { value: opacity },
          uHeatmapIntensity: { value: heatmapIntensity },
          uShowHeatmap: { value: showHeatmap }
        },
        transparent: true,
        side: THREE.DoubleSide
      });
      
      setBrainMaterial(material);
      
      // Appliquer le matériau au modèle
      brainModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    } else if (brainModel) {
      // Rétablir le matériau original si le heatmap est désactivé
      brainModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshPhongMaterial({
            color: '#e5e7eb',
            transparent: true,
            opacity,
            shininess: 20,
            specular: '#f3f4f6',
          });
        }
      });
      setBrainMaterial(null);
    }
  }, [brainModel, heatmapTexture, opacity, showHeatmap, heatmapIntensity]);
  
  // Mettre à jour les uniforms du matériau
  useEffect(() => {
    if (brainMaterial) {
      brainMaterial.uniforms.uOpacity.value = opacity;
      brainMaterial.uniforms.uHeatmapIntensity.value = heatmapIntensity;
      brainMaterial.uniforms.uShowHeatmap.value = showHeatmap;
      brainMaterial.needsUpdate = true;
    }
  }, [brainMaterial, opacity, heatmapIntensity, showHeatmap]);
  
  // Utiliser les données d'électrodes réelles si disponibles, sinon utiliser les positions générées
  let electrodeData: ElectrodeData[] = [];
  
  if (data.electrodeData && data.electrodeData.length > 0) {
    // Utiliser les données réelles
    electrodeData = data.electrodeData.map(electrode => ({
      name: electrode.name,
      position: [electrode.position[0], electrode.position[1], electrode.position[2]],
      voltage: electrode.voltage,
      isOriginal: electrode.isOriginal,
      region: getElectrodeRegion(electrode.name)
    }));
  } else {
    // Utiliser les positions générées si aucune donnée réelle n'est disponible
    const electrodePositions = generateInterpolatedElectrodePositions(electrodeCount);
    electrodeData = Object.entries(electrodePositions).map(([name, { x, y, z }]) => {
      let baseVoltage = 25;
      if (name.startsWith('F')) baseVoltage += 15;
      if (name.startsWith('C')) baseVoltage += 10;
      if (name.startsWith('P')) baseVoltage += 5;
      if (name.startsWith('O')) baseVoltage += 20;
      if (name.startsWith('T')) baseVoltage += 12;
      return {
        name,
        position: [x, y, z],
        voltage: baseVoltage + Math.random() * 30,
        isOriginal: Object.keys(ELECTRODE_POSITIONS_10_20).includes(name),
        region: getElectrodeRegion(name)
      };
    });
  }
  
  return (
    <group>
      {brainModel && <primitive object={brainModel} />}
      {showElectrodes &&
        electrodeData.map((electrode) => (
          <Electrode
            key={electrode.name}
            position={electrode.position}
            name={electrode.name}
            voltage={electrode.voltage}
            isVisible={true}
            showLabels={showLabels}
            showCoordinates={showCoordinates}
            isOriginal={electrode.isOriginal}
            region={electrode.region}
          />
        ))}
    </group>
  );
};

const ElectrodeMap3D: React.FC<ElectrodeMap3DProps> = ({ data }) => {
  const [electrodeCount, setElectrodeCount] = useState<16 | 32 | 64>(16);
  const [opacity, setOpacity] = useState<number>(0.8);
  const [showElectrodes, setShowElectrodes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(0.7);
  const [showControls, setShowControls] = useState<boolean>(true);
  
  if (!data?.electrodes) {
    return (
      <div className="p-8 text-center">
        <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Aucune donnée EEG disponible pour la visualisation 3D</p>
      </div>
    );
  }
  
  const maxElectrodes = data.patientConfig?.interpolationTarget || 64;
  const availableElectrodeCounts = [16, 32, 64].filter((count) => count <= maxElectrodes);
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <span>Cerveau Anatomique Réaliste 3D</span>
        </h3>
        <p className="text-gray-600">Modèle anatomique haute résolution avec heatmap d'activité cérébrale</p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
            <div className="h-[600px] relative">
              <Canvas camera={{ position: [0, 2, 0], fov: 65, up: [0, 0, -1], far: 1000 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
                <directionalLight position={[-10, -10, -5]} intensity={0.8} />
                <directionalLight position={[0, 10, 10]} intensity={1.0} />
                <pointLight position={[0, 0, 10]} intensity={1.0} />
                <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={1.0} castShadow />
                <Brain3D
                  electrodeCount={electrodeCount}
                  opacity={opacity}
                  showElectrodes={showElectrodes}
                  showLabels={showLabels}
                  showCoordinates={showCoordinates}
                  showHeatmap={showHeatmap}
                  heatmapIntensity={heatmapIntensity}
                  data={data}
                />
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  maxDistance={6}
                  minDistance={1.5}
                  autoRotate={false}
                  dampingFactor={0.05}
                  enableDamping={true}
                />
              </Canvas>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 flex items-center space-x-2">
                <Layers className="h-5 w-5 text-gray-600" />
                <span>Configuration</span>
              </h4>
              <button onClick={() => setShowControls(!showControls)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {showControls && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Nombre d'électrodes (Max: {maxElectrodes})
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {availableElectrodeCounts.map((count) => (
                      <button
                        key={count}
                        onClick={() => setElectrodeCount(count as 16 | 32 | 64)}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          electrodeCount === count ? 'bg-gray-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{count} Électrodes</div>
                          <div className="text-xs opacity-75">
                            {count === 16 && 'Système 10-20'}
                            {count === 32 && 'Résolution Étendue'}
                            {count === 64 && 'Haute Résolution'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transparence Cerveau: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intensité Heatmap: {Math.round(heatmapIntensity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={heatmapIntensity}
                    onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Électrodes Visibles</label>
                    <button
                      onClick={() => setShowElectrodes(!showElectrodes)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showElectrodes ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showElectrodes ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Étiquettes</label>
                    <button
                      onClick={() => setShowLabels(!showLabels)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showLabels ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showLabels ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Coordonnées</label>
                    <button
                      onClick={() => setShowCoordinates(!showCoordinates)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showCoordinates ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showCoordinates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Thermometer className="h-4 w-4 mr-1" />
                      Heatmap
                    </label>
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showHeatmap ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showHeatmap ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Légende du heatmap */}
          {showHeatmap && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Thermometer className="h-5 w-5 text-gray-600" />
                <span>Légende du Heatmap</span>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Activité faible</span>
                  <div className="w-24 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Activité moyenne</span>
                  <div className="w-24 h-4 bg-gradient-to-r from-green-500 to-yellow-500 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Activité élevée</span>
                  <div className="w-24 h-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded"></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Échelle: 0-100 µV
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectrodeMap3D;