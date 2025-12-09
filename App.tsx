import React, { useState, useMemo, useRef, Suspense, useEffect, useCallback } from 'react';
import { 
  Ruler, 
  RefreshCw, 
  ChevronDown, 
  ShoppingBag, 
  Truck,
  Check,
  Rotate3d,
  Upload,
  Plus,
  X,
  Construction,
  Settings,
  Trash2,
  FileBox,
  Plug,
  PackagePlus,
  Image as ImageIcon,
  FileText,
  Move,
  MousePointer2,
  ArrowUpToLine,
  Focus,
  Save,
  Download,
  Cloud,
  Loader2
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, useFBX, Center, Environment, ContactShadows, useTexture, Text, Line, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import { DeskState, INITIAL_STATE, ProductOption, CatalogOverrides } from './types';
import { supabase, uploadFile, isSupabaseConfigured } from './supabaseClient';

// --- DATA DEFINITION ---
const CATALOG = {
  sizes: [
    { id: '120x60', label: '120 x 60 cm', price: 0, value: '120x60' },
    { id: '140x70', label: '140 x 70 cm', price: 150, value: '140x70' },
    { id: '160x80', label: '160 x 80 cm', price: 300, value: '160x80' },
    { id: 'custom', label: 'Niestandardowy', price: 500, value: 'custom', description: 'Wymiar na zamówienie' },
  ] as ProductOption[],
  colors: [
    { id: 'oak', label: 'Dąb naturalny', price: 0, type: 'color', value: '#C29A6E' }, 
    { id: 'walnut', label: 'Orzech', price: 50, type: 'color', value: '#5D4037' },   
    { id: 'white', label: 'Biały', price: 0, type: 'color', value: '#F3F4F6' },      
    { id: 'black', label: 'Czarny', price: 50, type: 'color', value: '#1F2937' },    
  ] as ProductOption[],
  frameTypes: [
    { id: 'manual', label: 'Stelaż manualny', price: 0, description: 'Regulacja korbką' },
    { id: 'electric', label: 'Stelaż elektryczny', price: 800, description: 'Płynna regulacja wysokości' },
    { id: 'fixed', label: 'Stelaż stały', price: -200, description: 'Stała wysokość 75cm' },
  ] as ProductOption[],
  frameColors: [
    { id: 'black', label: 'Czarny', price: 0, type: 'color', value: '#1F2937' },
    { id: 'white', label: 'Biały', price: 0, type: 'color', value: '#F3F4F6' },
    { id: 'silver', label: 'Srebrny', price: 0, type: 'color', value: '#9CA3AF' },
  ] as ProductOption[],
  accessories: [
    { id: 'grommet', label: 'Przepust kablowy', price: 49, description: 'Okrągły, lewy/prawy' },
    { id: 'mediaport', label: 'Media port', price: 199, description: '2x USB, 1x 230V' },
    { id: 'wireless_charger', label: 'Ładowarka indukcyjna', price: 149, description: 'Wbudowana w blat' },
  ] as ProductOption[],
  addons: [
    { id: 'cable_tray', label: 'Rynna kablowa', price: 89, description: 'Organizator pod biurkiem' },
    { id: 'drawer', label: 'Szuflada podblatowa', price: 249, description: 'Dyskretny schowek' },
  ] as ProductOption[],
};

// --- HELPER ---
const getDimensions = (config: DeskState) => {
  const width = config.size === 'custom' ? config.customWidth : parseInt(config.size.split('x')[0]);
  const depth = config.size === 'custom' ? config.customDepth : parseInt(config.size.split('x')[1]);
  return { width, depth, height: 75, topThickness: 2.5 };
};

// --- 3D COMPONENTS ---

const Dimensions = ({ 
  config, 
  visible, 
  measuredDimensions,
  position = [0, 75, 0] // Default absolute position of the desk top
}: { 
  config: DeskState, 
  visible: boolean, 
  measuredDimensions: { width: number, depth: number, centerOffset: [number, number] } | null,
  position?: [number, number, number]
}) => {
  if (!visible) return null;
  
  // Determine dimensions and visual center offset
  const dims = measuredDimensions || { ...getDimensions(config), centerOffset: [0, 0] };
  const { width, depth } = dims;
  // centerOffset is relative to the pivot point (position)
  const [offX, offZ] = 'centerOffset' in dims ? (dims.centerOffset as [number, number]) : [0, 0];
  
  const height = position[1]; // Height of the desk top
  const color = "black";
  
  // Visual position of the bounding box center
  const visualCenterX = position[0] + offX;
  const visualCenterZ = position[2] + offZ;
  
  // Format for display
  const displayWidth = Math.round(width * 10) / 10;
  const displayDepth = Math.round(depth * 10) / 10;
  
  // Offsets for lines - Increased to prevent overlap with top
  const lineOffset = 35; 
  const textOffset = 15;
  
  return (
    <group position={[visualCenterX, height + 5, visualCenterZ]}>
      {/* Width Line (X-axis) - Back side */}
      <group position={[0, 0, -depth/2 - lineOffset]}>
        <Line points={[[-width/2, 0, 0], [width/2, 0, 0]]} color={color} lineWidth={2} />
        {/* End caps */}
        <Line points={[[-width/2, 0, -5], [-width/2, 0, 5]]} color={color} lineWidth={2} />
        <Line points={[[width/2, 0, -5], [width/2, 0, 5]]} color={color} lineWidth={2} />
        <Text position={[0, 0, -textOffset]} fontSize={12} color={color} rotation={[-Math.PI/2, 0, 0]}>
          {displayWidth} cm
        </Text>
      </group>

      {/* Depth Line (Z-axis) - Right side */}
      <group position={[width/2 + lineOffset, 0, 0]}>
        <Line points={[[0, 0, -depth/2], [0, 0, depth/2]]} color={color} lineWidth={2} />
        {/* End caps */}
        <Line points={[[-5, 0, -depth/2], [5, 0, -depth/2]]} color={color} lineWidth={2} />
        <Line points={[[-5, 0, depth/2], [5, 0, depth/2]]} color={color} lineWidth={2} />
        <Text position={[textOffset, 0, 0]} fontSize={12} color={color} rotation={[-Math.PI/2, 0, 0]} anchorX="center" anchorY="middle">
          {displayDepth} cm
        </Text>
      </group>
    </group>
  )
}

const TextureMaterial = ({ color, textureUrl, roughness = 0.6 }: { color: string, textureUrl?: string, roughness?: number }) => {
  if (!textureUrl) {
    return <meshStandardMaterial color={color} roughness={roughness} />;
  }
  return <Suspense fallback={<meshStandardMaterial color={color} roughness={roughness} />}>
     <TexturedStandardMaterial color={color} url={textureUrl} roughness={roughness} />
  </Suspense>;
}

const TexturedStandardMaterial = ({ color, url, roughness }: { color: string, url: string, roughness: number }) => {
  const texture = useTexture(url);
  useEffect(() => {
    if (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
    }
  }, [texture]);
  
  return <meshStandardMaterial color={color} map={texture} roughness={roughness} />;
}

const CustomFBXModel = ({ 
  url, 
  scale, 
  color, 
  textureUrl,
  onMeasure
}: { 
  url: string, 
  scale: number, 
  color?: string, 
  textureUrl?: string,
  onMeasure?: (width: number, depth: number, centerX: number, centerZ: number) => void
}) => {
  const fbx = useFBX(url);
  
  const scene = useMemo(() => {
    const clone = fbx.clone();
    
    // Pre-load texture if available
    let loadedTexture: THREE.Texture | null = null;
    if (textureUrl) {
      loadedTexture = new THREE.TextureLoader().load(textureUrl);
      loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
      loadedTexture.repeat.set(2, 1);
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        const processMaterial = (mat: THREE.Material) => {
          const newMat = mat.clone();
          
          if ('color' in newMat && color) {
             (newMat as any).color.set(color);
          }
          if ('map' in newMat && loadedTexture) {
             (newMat as any).map = loadedTexture;
             newMat.needsUpdate = true;
          }
          return newMat;
        };

        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(processMaterial);
        } else if (mesh.material) {
          mesh.material = processMaterial(mesh.material);
        }
      }
    });
    
    return clone;
  }, [fbx, color, textureUrl]);

  // Measure the model when scene or scale changes
  useEffect(() => {
    if (onMeasure && scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      
      // Pass scaled size and scaled center offset
      onMeasure(size.x * scale, size.z * scale, center.x * scale, center.z * scale);
    }
  }, [scene, scale, onMeasure]);
  
  return <primitive object={scene} scale={scale} />;
};

// --- INTERACTIVE WRAPPER ---
interface EditableElementProps {
  id: string; // The ProductOption ID to link to overrides
  editMode: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdatePosition: (id: string, newPos: [number, number, number]) => void;
  children: React.ReactNode;
  position?: [number, number, number];
}

const EditableElement: React.FC<EditableElementProps> = ({ id, editMode, selectedId, onSelect, onUpdatePosition, children, position = [0,0,0] }) => {
  const isSelected = selectedId === id;
  const groupRef = useRef<THREE.Group>(null);

  const handleClick = (e: any) => {
    if (editMode) {
      e.stopPropagation();
      onSelect(id);
    }
  };

  return (
    <>
      <group 
        ref={groupRef} 
        position={position} 
        onClick={handleClick}
        onPointerMissed={(e) => editMode && isSelected && onSelect(null as any)}
      >
        {children}
        {editMode && isSelected && (
           <mesh position={[0, 10, 0]} visible={false}>
              <sphereGeometry args={[2]} />
              <meshBasicMaterial color="red" wireframe />
           </mesh>
        )}
      </group>
      
      {editMode && isSelected && groupRef.current && (
        <TransformControls 
          object={groupRef.current} 
          mode="translate"
          onMouseUp={() => {
             if (groupRef.current) {
                const { x, y, z } = groupRef.current.position;
                // Snap to integer
                onUpdatePosition(id, [Math.round(x), Math.round(y), Math.round(z)]);
             }
          }}
        />
      )}
    </>
  );
};


const DeskTopRenderer = ({ 
  config, 
  overrides, 
  editMode, 
  selectedId, 
  onSelect, 
  onUpdatePosition,
  onMeasure
}: any) => {
  const { width, depth, height, topThickness } = getDimensions(config);
  const topColorHex = CATALOG.colors.find(c => c.id === config.topColor)?.value || '#C29A6E';

  const override = overrides[config.size];
  const positionOffset = override?.position || [0, 0, 0];
  
  // Custom Override from Admin Panel: Base Y is 0 (Trust Blender Origin)
  // Standard Mesh: Base Y is height (Lift to Frame Top)
  const isCustomModel = Boolean(override && override.url);
  const baseY = isCustomModel ? 0 : height;

  const finalPos: [number, number, number] = [
     0 + positionOffset[0],
     baseY + positionOffset[1],
     0 + positionOffset[2]
  ];

  // If standard, we reset measurement to null (let parent handle it or use default config)
  useEffect(() => {
    if (!isCustomModel && onMeasure) {
      onMeasure(null);
    }
  }, [isCustomModel, onMeasure]);

  return (
    <EditableElement 
      id={config.size} 
      editMode={editMode} 
      selectedId={selectedId} 
      onSelect={onSelect}
      onUpdatePosition={(id: string, pos: [number, number, number]) => {
         onUpdatePosition(id, [pos[0], pos[1] - baseY, pos[2]]);
      }}
      position={finalPos}
    >
        {isCustomModel ? (
            <CustomFBXModel 
              url={override!.url} 
              scale={override!.scale} 
              color={topColorHex} 
              textureUrl={override!.textureUrl || config.customTextureUrl} 
              onMeasure={onMeasure}
            />
        ) : (
            // STANDARD BOX: Manually positioned to sit ON TOP of local 0
            <mesh position={[0, topThickness / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, topThickness, depth]} />
              <TextureMaterial color={topColorHex} textureUrl={config.customTextureUrl} />
            </mesh>
        )}
    </EditableElement>
  );
};

const DeskFrameRenderer = ({ 
  config, 
  overrides,
  editMode,
  selectedId,
  onSelect,
  onUpdatePosition
}: any) => {
  const { width, depth, height } = getDimensions(config);
  const frameColorHex = CATALOG.frameColors.find(c => c.id === config.frameColor)?.value || '#1F2937';

  const override = overrides[config.frameType];
  const positionOffset = override?.position || [0, 0, 0];
  const finalPos: [number, number, number] = [
    positionOffset[0], positionOffset[1], positionOffset[2]
  ];

  return (
    <EditableElement
      id={config.frameType}
      editMode={editMode}
      selectedId={selectedId}
      onSelect={onSelect}
      onUpdatePosition={(id: string, pos: [number, number, number]) => onUpdatePosition(id, pos)}
      position={finalPos}
    >
       {override && override.url ? (
          <CustomFBXModel url={override.url} scale={override.scale} color={frameColorHex} />
       ) : (
         <group>
           {/* Legs */}
           <mesh position={[-width/2 + 10, height/2, 0]} castShadow>
              <boxGeometry args={[6, height, depth * 0.7]} />
              <meshStandardMaterial color={frameColorHex} metalness={0.6} roughness={0.2} />
           </mesh>
           <mesh position={[width/2 - 10, height/2, 0]} castShadow>
              <boxGeometry args={[6, height, depth * 0.7]} />
              <meshStandardMaterial color={frameColorHex} metalness={0.6} roughness={0.2} />
           </mesh>
           {/* Crossbar */}
           <mesh position={[0, height - 2.5, 0]}>
              <boxGeometry args={[width - 20, 5, 5]} />
              <meshStandardMaterial color={frameColorHex} metalness={0.6} roughness={0.2} />
           </mesh>
         </group>
       )}
    </EditableElement>
  );
};

const SceneContent = ({ 
  config, 
  overrides, 
  showDimensions, 
  editMode, 
  setOverrides,
  updateConfig,
  setMeasuredDimensions,
  measuredDimensions,
  controlsRef
}: { 
  config: DeskState, 
  overrides: CatalogOverrides, 
  showDimensions: boolean, 
  editMode: boolean, 
  setOverrides: React.Dispatch<React.SetStateAction<CatalogOverrides>>,
  updateConfig: (key: keyof DeskState, value: any) => void,
  setMeasuredDimensions: (dim: {width: number, depth: number, centerOffset: [number, number]} | null) => void,
  measuredDimensions: {width: number, depth: number, centerOffset: [number, number]} | null,
  controlsRef: any
}) => {
  const { width, depth, height, topThickness } = getDimensions(config);
  const topColorHex = CATALOG.colors.find(c => c.id === config.topColor)?.value;
  const frameColorHex = CATALOG.frameColors.find(c => c.id === config.frameColor)?.value;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // STABLE CALLBACK: Handles updates from Gizmo to avoid infinite re-renders
  const handleUpdatePosition = useCallback((id: string, newPos: [number, number, number]) => {
     if (id === 'user-desk') {
       // For user desk, subtract frame height offset if active
       const yOffset = config.customDeskOnFrame ? height : 0;
       updateConfig('customDeskPosition', [newPos[0], newPos[1] - yOffset, newPos[2]]);
     } else if (id === 'user-frame') {
       updateConfig('customFramePosition', newPos);
     } else {
       // Standard/Admin Items
       setOverrides(prev => ({
          ...prev,
          [id]: {
             ...(prev[id] || { url: '', scale: 1.0, fileName: 'Ręczna Edycja', position: [0,0,0] }), 
             position: newPos
          }
       }));
     }
  }, [config.customDeskOnFrame, height, updateConfig, setOverrides]);

  // STABLE CALLBACK: Handles measurement updates from CustomFBXModel
  const handleCustomMeasurement = useCallback((w: number | null, d?: number, cX?: number, cZ?: number) => {
    if (w === null) {
      setMeasuredDimensions(null);
    } else if (d !== undefined && cX !== undefined && cZ !== undefined) {
      setMeasuredDimensions({ width: w, depth: d, centerOffset: [cX, cZ] });
    }
  }, [setMeasuredDimensions]);

  // Calculate desk absolute position for dimensions
  const deskAbsolutePos: [number, number, number] = config.customDeskModelUrl 
    ? [
        config.customDeskPosition[0],
        config.customDeskPosition[1] + (config.customDeskOnFrame ? height : 0),
        config.customDeskPosition[2]
      ]
    : [0, height, 0];

  return (
    <>
      <group>
          {/* User Uploaded Top */}
          {config.customDeskModelUrl ? (
            <EditableElement
               id="user-desk"
               editMode={editMode}
               selectedId={selectedId}
               onSelect={setSelectedId}
               onUpdatePosition={handleUpdatePosition}
               position={deskAbsolutePos}
            >
                <Suspense fallback={null}>
                  <CustomFBXModel 
                    url={config.customDeskModelUrl} 
                    scale={config.customDeskScale} 
                    color={topColorHex} 
                    textureUrl={config.customTextureUrl}
                    onMeasure={handleCustomMeasurement}
                  />
                </Suspense>
            </EditableElement>
          ) : (
             <DeskTopRenderer 
                config={config} 
                overrides={overrides} 
                editMode={editMode}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdatePosition={handleUpdatePosition}
                onMeasure={handleCustomMeasurement}
             />
          )}

          {/* User Uploaded Frame */}
          {config.customFrameUrl ? (
             <EditableElement
                id="user-frame"
                editMode={editMode}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdatePosition={handleUpdatePosition}
                position={config.customFramePosition}
             >
                 <Suspense fallback={null}>
                    <CustomFBXModel url={config.customFrameUrl} scale={config.customFrameScale} color={frameColorHex} />
                 </Suspense>
             </EditableElement>
          ) : (
             <DeskFrameRenderer 
                config={config} 
                overrides={overrides}
                editMode={editMode}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdatePosition={handleUpdatePosition}
             />
          )}

          {/* Accessories (Standard & Overridden) */}
          {config.accessories.map(accId => {
            const override = overrides[accId];
            const posOffset = override?.position || [0, 0, 0];
            
            // Base Anchor: Top Surface
            const anchorY = height + topThickness;
            const finalPos: [number, number, number] = [
              posOffset[0],
              anchorY + posOffset[1],
              posOffset[2]
            ];
            
            return (
              <EditableElement
                key={accId}
                id={accId}
                editMode={editMode}
                selectedId={selectedId}
                onSelect={setSelectedId}
                position={finalPos}
                onUpdatePosition={(id, p) => {
                     // Store relative offset from Top Surface
                     handleUpdatePosition(id, [p[0], p[1] - anchorY, p[2]])
                }}
              >
                {override && override.url ? (
                  <Suspense fallback={null}>
                    <CustomFBXModel url={override.url} scale={override.scale} />
                  </Suspense>
                ) : (
                  // Standard Geometry Mocks (relative to anchor)
                  <group>
                     {accId === 'grommet' && (
                        <>
                          <mesh position={[-width/2 + 20, -topThickness/2, -depth/2 + 10]}>
                            <cylinderGeometry args={[3, 3, topThickness * 1.1, 32]} />
                            <meshStandardMaterial color="#222" />
                          </mesh>
                          <mesh position={[width/2 - 20, -topThickness/2, -depth/2 + 10]}>
                            <cylinderGeometry args={[3, 3, topThickness * 1.1, 32]} />
                            <meshStandardMaterial color="#222" />
                          </mesh>
                        </>
                     )}
                     {accId === 'mediaport' && (
                        <mesh position={[0, -topThickness/2, -depth/2 + 10]}>
                           <boxGeometry args={[16, topThickness * 1.1, 6]} />
                           <meshStandardMaterial color="#111" />
                        </mesh>
                     )}
                     {accId === 'wireless_charger' && (
                        <mesh position={[width/2 - 20, -topThickness/2, depth/2 - 20]}>
                           <cylinderGeometry args={[4, 4, topThickness * 1.1, 32]} />
                           <meshStandardMaterial color="#111" />
                        </mesh>
                     )}
                  </group>
                )}
              </EditableElement>
            );
          })}

          {/* Addons (Standard & Overridden) */}
          {config.addons.map(addonId => {
            const override = overrides[addonId];
            const posOffset = override?.position || [0, 0, 0];
            
            // Base Anchor: Bottom of Top (Top of Frame)
            const anchorY = height;
            const finalPos: [number, number, number] = [
              posOffset[0],
              anchorY + posOffset[1],
              posOffset[2]
            ];
            
            return (
              <EditableElement
                key={addonId}
                id={addonId}
                editMode={editMode}
                selectedId={selectedId}
                onSelect={setSelectedId}
                position={finalPos}
                onUpdatePosition={(id, p) => {
                     handleUpdatePosition(id, [p[0], p[1] - anchorY, p[2]])
                }}
              >
                {override && override.url ? (
                   <Suspense fallback={null}>
                    <CustomFBXModel url={override.url} scale={override.scale} />
                  </Suspense>
                ) : (
                  // Standard Geometry Mocks
                   <group>
                      {addonId === 'drawer' && (
                        <mesh position={[width/3, -5, 0]}>
                           <boxGeometry args={[30, 8, 40]} />
                           <meshStandardMaterial color="#333" />
                        </mesh>
                      )}
                      {addonId === 'cable_tray' && (
                        <mesh position={[0, -5, -depth/3]}>
                           <boxGeometry args={[width * 0.6, 5, 10]} />
                           <meshStandardMaterial color="#333" />
                        </mesh>
                      )}
                   </group>
                )}
              </EditableElement>
            );
          })}

        {/* Custom Extra Elements */}
        {config.customElements.map((el, idx) => (
          <group key={el.id} position={[30 * (idx + 1), 0, 30]}>
            <Suspense fallback={null}>
               <CustomFBXModel url={el.url} scale={0.05} />
            </Suspense>
          </group>
        ))}
      </group>
      
      <Dimensions 
        config={config} 
        visible={showDimensions} 
        measuredDimensions={measuredDimensions} 
        position={deskAbsolutePos}
      />

      <ContactShadows opacity={0.4} scale={200} blur={2} far={10} resolution={256} color="#000000" />
      <Environment preset="city" />
      <OrbitControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} enabled={!editMode} />
    </>
  );
};

// --- ADMIN ROW COMPONENT ---
interface AdminRowProps {
  item: ProductOption;
  overrides: CatalogOverrides;
  updateOverrideScale: (id: string, scale: number) => void;
  updateOverridePosition: (id: string, axis: 0 | 1 | 2, value: number) => void;
  removeOverride: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, id: string, type: 'model' | 'texture') => void;
  isUploading: boolean;
}

const AdminRow: React.FC<AdminRowProps> = ({ 
  item, 
  overrides, 
  updateOverrideScale, 
  updateOverridePosition,
  removeOverride, 
  onUpload,
  isUploading
}) => {
  const override = overrides[item.id];
  const position = override?.position || [0, 0, 0];

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
         <div className="font-medium">{item.label}</div>
      </div>
      
      <div className="flex-1">
        {override ? (
          <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-green-200 text-green-700 text-sm flex-1 min-w-0">
                    <FileBox size={16} className="shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate">{override.fileName}</span>
                      {override.textureUrl && (
                        <span className="text-[10px] text-blue-500 flex items-center gap-1">
                          <ImageIcon size={10} /> + Tekstura
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeOverride(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Usuń model">
                    <Trash2 size={18} />
                  </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 {/* Texture Upload */}
                <label className={`flex items-center justify-center gap-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer text-gray-600 text-xs ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Wgraj Teksturę">
                  {isUploading ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />}
                  {override.textureUrl ? 'Zmień teksturę' : 'Dodaj teksturę'}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e, item.id, 'texture')} disabled={isUploading} />
                </label>
                
                {/* Scale Input */}
                <div className="flex items-center gap-2 bg-white px-2 rounded border">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Skala</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={override.scale} 
                    onChange={(e) => updateOverrideScale(item.id, parseFloat(e.target.value))}
                    className="w-full p-1 text-sm outline-none bg-transparent"
                  />
                </div>
              </div>
              
              {/* Position Inputs */}
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <Move size={14} className="text-gray-400" />
                <div className="flex gap-2 w-full">
                  {['X', 'Y', 'Z'].map((axis, idx) => (
                    <div key={axis} className="flex-1 flex items-center gap-1">
                       <span className="text-[10px] text-gray-400 font-bold">{axis}</span>
                       <input 
                          type="number" 
                          step="1"
                          value={position[idx]}
                          onChange={(e) => updateOverridePosition(item.id, idx as 0|1|2, parseFloat(e.target.value))}
                          className="w-full text-xs p-1 border rounded"
                       />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 italic">
                Użyj trybu edycji (strzałki) w widoku 3D aby przesuwać
              </div>

          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition text-sm text-gray-600 w-full justify-center ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {isUploading ? 'Wysyłanie...' : 'Wgraj FBX'}
              <input type="file" className="hidden" accept=".fbx" onChange={(e) => onUpload(e, item.id, 'model')} disabled={isUploading} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}


// --- MAIN APP COMPONENT ---
export default function App() {
  const [config, setConfig] = useState<DeskState>(INITIAL_STATE);
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [overrides, setOverrides] = useState<CatalogOverrides>({});
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [measuredDimensions, setMeasuredDimensions] = useState<{width: number, depth: number, centerOffset: [number, number]} | null>(null);
  
  // Supabase / Cloud State
  const [isUploading, setIsUploading] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const deskInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const elementInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<any>(null);

  // AUTO LOAD LATEST CONFIG ON START
  useEffect(() => {
    // Only attempt to load if keys are configured
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, skipping auto-load.");
      return;
    }

    const autoLoad = async () => {
      setIsUploading(true);
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const record = data[0];
          if (record.data) {
             if (record.data.config) setConfig(record.data.config);
             if (record.data.overrides) setOverrides(record.data.overrides);
             console.log("Automatycznie wczytano najnowszą konfigurację:", record.name);
          }
        }
      } catch (e) {
        // Silent catch for auto-load to not disrupt UX if offline/RLS issues
        console.log("Auto-load skipped or failed:", e);
      } finally {
        setIsUploading(false);
      }
    };

    autoLoad();
  }, []);

  const totalPrice = useMemo(() => {
    let total = 999; 
    if (config.size === 'custom') {
      const standardArea = 140 * 70;
      const customArea = config.customWidth * config.customDepth;
      const areaFactor = Math.max(0, (customArea - standardArea) * 0.15);
      total += 500 + Math.round(areaFactor);
    } else {
      const size = CATALOG.sizes.find(s => s.id === config.size);
      if (size) total += size.price;
    }
    const color = CATALOG.colors.find(c => c.id === config.topColor);
    if (color) total += color.price;
    const frame = CATALOG.frameTypes.find(f => f.id === config.frameType);
    if (frame) total += frame.price;
    config.accessories.forEach(accId => {
      const item = CATALOG.accessories.find(a => a.id === accId);
      if (item) total += item.price;
    });
    config.addons.forEach(addOnId => {
      const item = CATALOG.addons.find(a => a.id === addOnId);
      if (item) total += item.price;
    });
    return total;
  }, [config]);

  const toggleStep = (stepNumber: number) => {
    setActiveStep(activeStep === stepNumber ? null : stepNumber);
  };
  const updateConfig = (key: keyof DeskState, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  const toggleArrayItem = (key: 'accessories' | 'addons', value: string) => {
    setConfig(prev => {
      const current = prev[key];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter(item => item !== value) : [...current, value]
      };
    });
  };

  // --- SUPABASE ACTIONS ---

  const handleCloudUpload = async (file: File, type: 'models' | 'textures'): Promise<string | null> => {
    setIsUploading(true);
    const url = await uploadFile(file, type);
    setIsUploading(false);
    return url;
  };

  const saveConfiguration = async () => {
    if (!isSupabaseConfigured) {
        alert("⛔ BŁĄD KONFIGURACJI: Aplikacja nie widzi kluczy Supabase.\n\nJeśli dodałeś zmienne w Netlify (Environment Variables), musisz PRZEBUDOWAĆ stronę, aby zadziałały.\n\nIdź do Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.");
        return;
    }

    const name = prompt("Podaj nazwę konfiguracji:");
    if (!name) return;
    
    setIsUploading(true);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .insert([{
          name,
          data: { config, overrides }
        }])
        .select();

      if (error) throw error;
      alert("Konfiguracja zapisana pomyślnie!");
    } catch (e: any) {
      console.error('Save configuration failed:', JSON.stringify(e, null, 2));
      const msg = e.message || JSON.stringify(e);
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy') || (e.code === '42501')) {
         alert("⛔ BŁĄD ZAPISU (RLS)\n\nBaza danych blokuje zapis do tabeli 'configurations'.\n\nNAPRAWA: W panelu Supabase, wejdź w 'Table Editor' -> 'configurations' -> 'Add RLS Policy' -> 'Enable insert for anon'.");
      } else {
         alert("Błąd zapisu: " + msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const loadConfigurations = async () => {
    if (!isSupabaseConfigured) {
        alert("⛔ BŁĄD KONFIGURACJI: Aplikacja nie widzi kluczy Supabase.\n\nJeśli dodałeś zmienne w Netlify (Environment Variables), musisz PRZEBUDOWAĆ stronę, aby zadziałały.\n\nIdź do Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.");
        return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      setSavedConfigs(data || []);
      setShowLoadModal(true);
    } catch (e: any) {
      console.error('Load configuration failed:', JSON.stringify(e, null, 2));
      const msg = e.message || JSON.stringify(e);
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy') || (e.code === '42501')) {
         alert("⛔ BŁĄD ODCZYTU (RLS)\n\nBaza danych blokuje odczyt tabeli 'configurations'.\n\nNAPRAWA: W panelu Supabase, dodaj politykę SELECT dla roli 'anon'.");
      } else if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
          alert("⛔ BŁĄD POŁĄCZENIA\n\nPrawdopodobnie klucze API nie są poprawnie załadowane lub problem z siecią.\n\nSPRÓBUJ: Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.");
      } else {
         alert("Błąd ładowania: " + msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const loadConfiguration = (record: any) => {
    if (record.data) {
       setConfig(record.data.config);
       setOverrides(record.data.overrides);
       setShowLoadModal(false);
    }
  };

  // --- UPLOAD HANDLERS (UPDATED TO USE SUPABASE) ---

  const handleDeskUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleCloudUpload(file, 'models');
      if (url) {
        setConfig(prev => ({ ...prev, customDeskModelUrl: url, customDeskScale: 1.0, customDeskPosition: [0,0,0] }));
      }
    }
  };
  const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleCloudUpload(file, 'models');
      if (url) {
        setConfig(prev => ({ ...prev, customFrameUrl: url, customFrameScale: 1.0, customFramePosition: [0,0,0] }));
      }
    }
  };
  const handleTextureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleCloudUpload(file, 'textures');
      if (url) {
        setConfig(prev => ({ ...prev, customTextureUrl: url }));
      }
    }
  };
  const handleElementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleCloudUpload(file, 'models');
      if (url) {
        setConfig(prev => ({ 
          ...prev, 
          customElements: [...prev.customElements, { id: Date.now().toString(), name: file.name, url }] 
        }));
      }
    }
  };
  
  // ADMIN UPLOADS
  const handleAdminUploadWithSupabase = async (e: React.ChangeEvent<HTMLInputElement>, id: string, type: 'model' | 'texture') => {
     const file = e.target.files?.[0];
     if (!file) return;

     const bucket = type === 'model' ? 'models' : 'textures';
     const url = await handleCloudUpload(file, bucket);

     if (url) {
        setOverrides(prev => {
           const existing = prev[id] || { scale: 1.0, position: [0,0,0], fileName: 'Nowy' };
           if (type === 'model') {
             return { ...prev, [id]: { ...existing, url, fileName: file.name } };
           } else {
             return { ...prev, [id]: { ...existing, textureUrl: url } };
           }
        });
     }
  };

  const updateOverrideScale = (id: string, scale: number) => {
    setOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], scale }
    }));
  };
  const updateOverridePosition = (id: string, axis: 0 | 1 | 2, value: number) => {
    setOverrides(prev => {
      const current = prev[id].position || [0,0,0];
      const newPos = [...current] as [number, number, number];
      newPos[axis] = value;
      return {
        ...prev,
        [id]: { ...prev[id], position: newPos }
      };
    });
  };
  const removeOverride = (id: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const clearCustomDesk = () => setConfig(prev => ({ ...prev, customDeskModelUrl: undefined }));
  const clearCustomFrame = () => setConfig(prev => ({ ...prev, customFrameUrl: undefined }));
  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    doc.setFontSize(22);
    doc.text("Konfiguracja Biurka", margin, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), margin, y);
    y += 20;
    doc.setFontSize(14);
    doc.text("Szczegóły zamówienia:", margin, y);
    y += 10;
    const addLine = (label: string, value: string) => {
      doc.setFontSize(11);
      doc.text(`${label}:`, margin, y);
      doc.text(value, margin + 50, y);
      y += 8;
    };
    const sizeLabel = CATALOG.sizes.find(s => s.id === config.size)?.label || config.size;
    addLine("Rozmiar blatu", config.size === 'custom' ? `${config.customWidth} x ${config.customDepth} cm` : sizeLabel);
    const colorLabel = CATALOG.colors.find(c => c.id === config.topColor)?.label || "Standard";
    addLine("Kolor blatu", colorLabel);
    const frameLabel = CATALOG.frameTypes.find(f => f.id === config.frameType)?.label || "";
    const frameColorLabel = CATALOG.frameColors.find(c => c.id === config.frameColor)?.label || "";
    addLine("Stelaż", `${frameLabel} (${frameColorLabel})`);
    if (config.accessories.length > 0) {
      y += 5;
      doc.text("Akcesoria:", margin, y);
      y += 8;
      config.accessories.forEach(acc => {
        const label = CATALOG.accessories.find(a => a.id === acc)?.label;
        if (label) {
          doc.text(`- ${label}`, margin + 5, y);
          y += 6;
        }
      });
    }
    if (config.addons.length > 0) {
      y += 5;
      doc.text("Dodatki:", margin, y);
      y += 8;
      config.addons.forEach(acc => {
        const label = CATALOG.addons.find(a => a.id === acc)?.label;
        if (label) {
          doc.text(`- ${label}`, margin + 5, y);
          y += 6;
        }
      });
    }
    y += 15;
    doc.setFontSize(16);
    doc.text(`Cena całkowita: ${totalPrice} zł`, margin, y);
    doc.save("moje-biurko.pdf");
  };
  const handleCenterView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans text-gray-900">
      <div className="relative bg-white shadow-sm border-b border-gray-100">
        
        {/* Actions Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
          <button onClick={generatePDF} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition text-gray-700" title="Pobierz PDF"><FileText size={20} /></button>
          
          <div className="h-px bg-gray-200 mx-2" />
          
          <button onClick={saveConfiguration} disabled={isUploading} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition text-blue-600" title="Zapisz Konfigurację">
            {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
          </button>
          <button onClick={loadConfigurations} disabled={isUploading} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition text-blue-600" title="Wczytaj Konfigurację">
             <Cloud size={20} />
          </button>

          <div className="h-px bg-gray-200 mx-2" />

          <button onClick={() => setShowDimensions(!showDimensions)} className={`w-10 h-10 rounded-full shadow flex items-center justify-center transition ${showDimensions ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`} title="Pokaż wymiary"><Ruler size={20} /></button>
          <button onClick={() => setEditMode(!editMode)} className={`w-10 h-10 rounded-full shadow flex items-center justify-center transition ${editMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`} title="Tryb Edycji"><MousePointer2 size={20} /></button>
          <button onClick={handleCenterView} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition text-gray-700" title="Wycentruj widok"><ArrowUpToLine size={20} /></button>
          <button onClick={() => setConfig(INITIAL_STATE)} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition text-gray-700" title="Resetuj"><RefreshCw size={20} /></button>
          <button onClick={() => setShowAdmin(true)} className="w-10 h-10 bg-gray-800 text-white rounded-full shadow flex items-center justify-center hover:bg-black transition" title="Admin"><Settings size={20} /></button>
        </div>
        
        {editMode && <div className="absolute top-4 left-20 z-10 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow animate-in fade-in">TRYB EDYCJI: Kliknij element aby przesunąć</div>}

        {/* Scene Props Toolbar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/90 p-2 rounded-lg shadow backdrop-blur-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase text-center mb-1">Scena</p>
          <button onClick={() => elementInputRef.current?.click()} disabled={isUploading} className="p-2 rounded hover:bg-gray-100 text-gray-600"><Plus size={18} /></button>
          <button onClick={() => deskInputRef.current?.click()} disabled={isUploading} className="p-2 rounded hover:bg-gray-100 text-gray-600"><Upload size={18} /></button>
          <button onClick={() => frameInputRef.current?.click()} disabled={isUploading} className="p-2 rounded hover:bg-gray-100 text-gray-600"><Construction size={18} /></button>
          <input type="file" ref={deskInputRef} onChange={handleDeskUpload} accept=".fbx" className="hidden" />
          <input type="file" ref={frameInputRef} onChange={handleFrameUpload} accept=".fbx" className="hidden" />
          <input type="file" ref={elementInputRef} onChange={handleElementUpload} accept=".fbx" className="hidden" />
        </div>
        
        {/* Is Uploading Overlay */}
        {isUploading && (
           <div className="absolute top-20 right-4 z-20 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-xs font-bold">Wysyłanie do chmury...</span>
           </div>
        )}

        {/* Custom Model Overlay */}
        {(config.customDeskModelUrl || config.customFrameUrl) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 backdrop-blur shadow-lg p-3 rounded-xl flex flex-col gap-3 items-center min-w-[240px] border border-gray-100">
             {config.customDeskModelUrl && (
               <div className="w-full">
                 <div className="flex items-center justify-between w-full gap-4 text-sm font-medium text-blue-900 border-b border-blue-100 pb-1 mb-2">
                    <span>Własny blat</span>
                    <button onClick={clearCustomDesk} className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><X size={14}/></button>
                 </div>
                 <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-gray-500"><span>Skala</span><span>{config.customDeskScale.toFixed(3)}x</span></div>
                    <input type="range" min="0.01" max="5.0" step="0.01" value={config.customDeskScale} onChange={(e) => updateConfig('customDeskScale', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pt-1"><input type="checkbox" checked={config.customDeskOnFrame} onChange={(e) => updateConfig('customDeskOnFrame', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span>Połóż na stelażu (+75cm)</span></label>
                 </div>
               </div>
             )}
             {config.customFrameUrl && (
               <div className="w-full pt-2">
                 <div className="flex items-center justify-between w-full gap-4 text-sm font-medium text-blue-900 border-b border-blue-100 pb-1 mb-2">
                    <span>Własny stelaż</span>
                    <button onClick={clearCustomFrame} className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><X size={14}/></button>
                 </div>
                 <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Skala</span><span>{config.customFrameScale.toFixed(3)}x</span></div>
                    <input type="range" min="0.01" max="5.0" step="0.01" value={config.customFrameScale} onChange={(e) => updateConfig('customFrameScale', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                 </div>
               </div>
             )}
          </div>
        )}

        <div className="w-full h-[500px] bg-gray-100">
           <Canvas shadows camera={{ position: [0, 100, 200], fov: 45 }}>
              <color attach="background" args={['#f8f9fa']} />
              <ambientLight intensity={0.7} />
              <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
              
              <Suspense fallback={null}>
                {/* Changed: Disable auto-centering to prevent shifts */}
                <Stage environment="city" intensity={0.5} contactShadow={false} center={false}>
                  <SceneContent 
                    config={config} 
                    overrides={overrides} 
                    showDimensions={showDimensions} 
                    editMode={editMode}
                    setOverrides={setOverrides}
                    updateConfig={updateConfig}
                    setMeasuredDimensions={setMeasuredDimensions}
                    measuredDimensions={measuredDimensions}
                    controlsRef={controlsRef}
                  />
                </Stage>
              </Suspense>
              
              <Grid infiniteGrid fadeDistance={400} fadeStrength={5} cellColor="#ccc" sectionColor="#aaa" />
           </Canvas>
        </div>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-none opacity-60 flex items-center gap-2">
           <Rotate3d size={16} />
           <span className="text-xs font-medium">Obracaj i przybliżaj {editMode && '(Obracanie wyłączone w trybie edycji)'}</span>
        </div>
      </div>
      
      {/* CONFIGURATION STEPS */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Step 1 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <button onClick={() => toggleStep(1)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
            <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">1</div><span className="font-bold text-lg">Konfiguracja blatu</span></div><ChevronDown className={`transform transition-transform duration-300 ${activeStep === 1 ? 'rotate-180' : ''}`} />
          </button>
          {activeStep === 1 && (
            <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-500 mb-3 mt-3">Wybierz rozmiar blatu:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CATALOG.sizes.map(size => (
                  <button key={size.id} onClick={() => updateConfig('size', size.id)} className={`p-3 rounded-lg border-2 text-center transition-all ${config.size === size.id ? 'border-black bg-white shadow-md scale-[1.02]' : 'border-transparent bg-white hover:border-gray-300'}`}>
                    <div className="font-semibold">{size.label}</div><div className="text-sm text-gray-500">{size.price > 0 ? `+${size.price} zł` : 'W cenie'}</div>
                    {overrides[size.id] && <div className="mt-1 text-[10px] text-green-600 font-bold bg-green-100 inline-block px-1 rounded">Model 3D</div>}
                  </button>
                ))}
              </div>
              {config.size === 'custom' && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-sm font-semibold mb-3">Wprowadź wymiary (cm):</p>
                  <div className="flex gap-4">
                    <div className="flex-1"><label className="text-xs text-gray-500 block mb-1">Szerokość</label><input type="number" value={config.customWidth} onChange={(e) => updateConfig('customWidth', Math.max(100, Math.min(200, parseInt(e.target.value) || 0)))} className="w-full border border-gray-300 rounded p-2"/></div>
                    <div className="flex-1"><label className="text-xs text-gray-500 block mb-1">Głębokość</label><input type="number" value={config.customDepth} onChange={(e) => updateConfig('customDepth', Math.max(50, Math.min(100, parseInt(e.target.value) || 0)))} className="w-full border border-gray-300 rounded p-2"/></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Step 2 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <button onClick={() => toggleStep(2)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
             <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">2</div><span className="font-bold text-lg">Kolor</span></div><ChevronDown className={`transform transition-transform duration-300 ${activeStep === 2 ? 'rotate-180' : ''}`} />
          </button>
          {activeStep === 2 && (
             <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50">
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 mt-3">
                {CATALOG.colors.map(color => (
                  <button key={color.id} onClick={() => updateConfig('topColor', color.id)} className={`group relative p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${config.topColor === color.id && !config.customTextureUrl ? 'border-black bg-white shadow-md' : 'border-transparent bg-white'}`}>
                    <div className="w-12 h-12 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: color.value }} />
                    <div className="text-center"><div className="font-medium text-sm">{color.label}</div></div>
                  </button>
                ))}
               </div>
               <div className="mb-4">
                 <input type="file" ref={textureInputRef} onChange={handleTextureUpload} accept="image/*" className="hidden" disabled={isUploading} />
                 <button onClick={() => textureInputRef.current?.click()} disabled={isUploading} className={`w-full p-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-all ${config.customTextureUrl ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300'}`}>
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                    {config.customTextureUrl ? 'Zmień teksturę' : 'Wgraj własną teksturę'}
                 </button>
               </div>
             </div>
          )}
        </div>
        {/* Step 3 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
           <button onClick={() => toggleStep(3)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">3</div><span className="font-bold text-lg">Stelaż biurka</span></div><ChevronDown className={`transform transition-transform duration-300 ${activeStep === 3 ? 'rotate-180' : ''}`} /></button>
           {activeStep === 3 && (
             <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50"><div className="space-y-3 mb-6 mt-3">{CATALOG.frameTypes.map(frame => (<button key={frame.id} onClick={() => updateConfig('frameType', frame.id)} className={`w-full p-4 rounded-lg border-2 flex items-center justify-between ${config.frameType === frame.id ? 'border-black bg-white shadow-md' : 'border-transparent bg-white'}`}><div className="text-left"><div className="font-semibold">{frame.label}</div><div className="text-sm text-gray-500">{frame.description}</div></div></button>))}</div><div className="flex flex-wrap gap-4">{CATALOG.frameColors.map(color => (<button key={color.id} onClick={() => updateConfig('frameColor', color.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white ${config.frameColor === color.id ? 'ring-2 ring-black' : ''}`}><div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color.value }} /><span className="text-sm font-medium">{color.label}</span></button>))}</div></div>
           )}
        </div>
        {/* Step 4 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
           <button onClick={() => toggleStep(4)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">4</div><span className="font-bold text-lg">Akcesoria nablatowe</span></div><ChevronDown className={`transform transition-transform duration-300 ${activeStep === 4 ? 'rotate-180' : ''}`} /></button>
           {activeStep === 4 && (
             <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50"><div className="space-y-2 mt-3">{CATALOG.accessories.map(item => (<button key={item.id} onClick={() => toggleArrayItem('accessories', item.id)} className={`w-full p-3 rounded-lg border flex items-center justify-between ${config.accessories.includes(item.id) ? 'border-black bg-white shadow-sm ring-1 ring-black/5' : 'border-gray-200 bg-white'}`}><div className="flex items-center gap-3"><div className={`w-5 h-5 rounded border flex items-center justify-center ${config.accessories.includes(item.id) ? 'bg-black border-black text-white' : 'border-gray-400'}`}>{config.accessories.includes(item.id) && <Check size={14} />}</div><div className="text-left"><div className="flex items-center gap-2"><div className="font-medium text-sm">{item.label}</div>{overrides[item.id] && <div className="text-[10px] text-green-600 font-bold bg-green-100 px-1 rounded">Model 3D</div>}</div><div className="text-xs text-gray-500">{item.description}</div></div></div><div className="text-sm font-semibold">+{item.price} zł</div></button>))}</div></div>
           )}
        </div>
        {/* Step 5 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
           <button onClick={() => toggleStep(5)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">5</div><span className="font-bold text-lg">Dodatki</span></div><ChevronDown className={`transform transition-transform duration-300 ${activeStep === 5 ? 'rotate-180' : ''}`} /></button>
           {activeStep === 5 && (
             <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50"><div className="space-y-2 mt-3">{CATALOG.addons.map(item => (<button key={item.id} onClick={() => toggleArrayItem('addons', item.id)} className={`w-full p-3 rounded-lg border flex items-center justify-between ${config.addons.includes(item.id) ? 'border-black bg-white shadow-sm ring-1 ring-black/5' : 'border-gray-200 bg-white'}`}><div className="flex items-center gap-3"><div className={`w-5 h-5 rounded border flex items-center justify-center ${config.addons.includes(item.id) ? 'bg-black border-black text-white' : 'border-gray-400'}`}>{config.addons.includes(item.id) && <Check size={14} />}</div><div className="text-left"><div className="flex items-center gap-2"><div className="font-medium text-sm">{item.label}</div>{overrides[item.id] && <div className="text-[10px] text-green-600 font-bold bg-green-100 px-1 rounded">Model 3D</div>}</div><div className="text-xs text-gray-500">{item.description}</div></div></div><div className="text-sm font-semibold">+{item.price} zł</div></button>))}</div></div>
           )}
        </div>
      </div>

      {showAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50"><h2 className="text-xl font-bold flex items-center gap-2">Panel Administratora</h2><button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
               
              {/* Size Overrides */}
              <section>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg"><Ruler size={18} />Modele Blatów (Rozmiary)</h3>
                <div className="space-y-4">{CATALOG.sizes.filter(s => s.id !== 'custom').map(size => (
                    <AdminRow 
                      key={size.id} 
                      item={size} 
                      overrides={overrides} 
                      updateOverrideScale={updateOverrideScale} 
                      updateOverridePosition={updateOverridePosition} 
                      removeOverride={removeOverride} 
                      onUpload={handleAdminUploadWithSupabase} 
                      isUploading={isUploading}
                    />
                ))}</div>
              </section>

              <div className="h-px bg-gray-100" />

              {/* Frame Overrides */}
              <section>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg"><Construction size={18} />Modele Stelaży</h3>
                <div className="space-y-4">{CATALOG.frameTypes.map(frame => (
                    <AdminRow 
                      key={frame.id} 
                      item={frame} 
                      overrides={overrides} 
                      updateOverrideScale={updateOverrideScale} 
                      updateOverridePosition={updateOverridePosition} 
                      removeOverride={removeOverride} 
                      onUpload={handleAdminUploadWithSupabase}
                      isUploading={isUploading}
                    />
                ))}</div>
              </section>

              <div className="h-px bg-gray-100" />

              {/* Accessories Overrides */}
              <section>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg"><Plug size={18} />Modele Akcesoriów</h3>
                <div className="space-y-4">{CATALOG.accessories.map(item => (
                    <AdminRow 
                      key={item.id} 
                      item={item} 
                      overrides={overrides} 
                      updateOverrideScale={updateOverrideScale} 
                      updateOverridePosition={updateOverridePosition} 
                      removeOverride={removeOverride} 
                      onUpload={handleAdminUploadWithSupabase}
                      isUploading={isUploading}
                    />
                ))}</div>
              </section>

              <div className="h-px bg-gray-100" />

              {/* Addons Overrides */}
              <section>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg"><PackagePlus size={18} />Modele Dodatków</h3>
                <div className="space-y-4">{CATALOG.addons.map(item => (
                    <AdminRow 
                      key={item.id} 
                      item={item} 
                      overrides={overrides} 
                      updateOverrideScale={updateOverrideScale} 
                      updateOverridePosition={updateOverridePosition} 
                      removeOverride={removeOverride} 
                      onUpload={handleAdminUploadWithSupabase}
                      isUploading={isUploading}
                    />
                ))}</div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* LOAD CONFIGURATION MODAL */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
             <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
               <h2 className="text-lg font-bold">Wczytaj konfigurację</h2>
               <button onClick={() => setShowLoadModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full"><X size={18} /></button>
             </div>
             <div className="p-4 overflow-y-auto">
               {savedConfigs.length === 0 ? (
                 <p className="text-center text-gray-500 py-4">Brak zapisanych konfiguracji.</p>
               ) : (
                 <div className="space-y-2">
                   {savedConfigs.map(record => (
                     <button 
                        key={record.id} 
                        onClick={() => loadConfiguration(record)}
                        className="w-full flex flex-col p-3 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition text-left"
                     >
                        <span className="font-bold text-gray-800">{record.name}</span>
                        <span className="text-xs text-gray-500">{new Date(record.created_at).toLocaleString()}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2"><div><span className="text-gray-500 text-sm">Razem:</span><div className="text-2xl font-bold">{totalPrice} zł</div></div><div className="text-right hidden sm:block"><div className="flex items-center gap-1 text-xs text-gray-500"><Truck size={14} />Czas realizacji: 5-15 dni roboczych</div></div></div>
          <button className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition active:scale-[0.98] shadow-xl shadow-black/10"><ShoppingBag size={20} />Do koszyka</button>
        </div>
      </div>
    </div>
  );
}