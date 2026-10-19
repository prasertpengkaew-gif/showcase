import type { ModelAsset, ModelId } from '../types/project';

/**
 * 3D assets bundled in /public/models. All are openly licensed sample assets — see
 * the credit on each entry. Replace or extend this list with your own GLB/GLTF files.
 */
export const models: Record<ModelId, ModelAsset> = {
  chair: {
    id: 'chair',
    name: 'Lounge Chair',
    src: '/models/chair.glb',
    poster: '/images/posters/chair.webp',
    alt: 'Upholstered lounge chair with a wooden frame and velvet seat',
    dimensions: '83 × 69 × 57 cm',
    variants: ['Mango Velvet', 'Peacock Velvet'],
    cameraOrbit: '35deg 75deg auto',
    credit: {
      title: 'SheenChair',
      author: 'Eric Chadwick / Wayfair, LLC',
      license: 'CC0 1.0',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair',
    },
  },
  robot: {
    id: 'robot',
    name: 'Service Robot',
    src: '/models/robot.glb',
    poster: '/images/posters/robot.webp',
    alt: 'Friendly cartoon robot with a rounded head, standing upright',
    dimensions: '120 cm tall',
    animations: ['Idle', 'Wave', 'Walking', 'Dance', 'ThumbsUp', 'Yes', 'No', 'Jump'],
    defaultAnimation: 'Idle',
    cameraOrbit: '20deg 80deg auto',
    credit: {
      title: 'RobotExpressive',
      author: 'Tomás Laulhé (Quaternius), modifications by Don McCurdy',
      license: 'CC0 1.0',
      sourceUrl:
        'https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive',
      notes: 'Rescaled to 1.2 m and skin weights normalized for glTF validation.',
    },
  },
  car: {
    id: 'car',
    name: 'Scale Model Car',
    src: '/models/car.glb',
    poster: '/images/posters/car.webp',
    alt: 'Glossy green toy car with clear windows on a red cloth display stand',
    dimensions: '73 × 29 × 74 cm (enlarged display scale)',
    cameraOrbit: '45deg 72deg 1.3m',
    cameraTarget: 'auto 0.1m auto',
    credit: {
      title: 'ToyCar',
      author: 'Guido Odendahl, scene by Eric Chadwick',
      license: 'CC0 1.0',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ToyCar',
      notes: 'Enlarged 10× from the original 7 cm toy so it is easy to inspect in AR.',
    },
  },
  fox: {
    id: 'fox',
    name: 'Red Fox',
    src: '/models/fox.glb',
    poster: '/images/posters/fox.webp',
    alt: 'Low-poly red fox standing on four legs',
    dimensions: '93 cm long, 47 cm tall',
    animations: ['Survey', 'Walk', 'Run'],
    defaultAnimation: 'Survey',
    cameraOrbit: '60deg 75deg auto',
    credit: {
      title: 'Fox',
      author: 'PixelMannen (model), tomkranis (rigging), @AsoboStudio & @scurest (conversion)',
      license: 'CC BY 4.0',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox',
      notes: 'Rescaled to real-world size.',
    },
  },
  sofa: {
    id: 'sofa',
    name: 'Velvet Sofa',
    src: '/models/sofa.glb',
    poster: '/images/posters/sofa.webp',
    alt: 'Three-seat velvet sofa with tufted back and slim metal legs',
    dimensions: '219 × 79 × 102 cm',
    variants: ['Champagne', 'Navy', 'Gray', 'Black', 'Pale Pink'],
    cameraOrbit: '25deg 75deg auto',
    credit: {
      title: 'GlamVelvetSofa',
      author: 'Eric Chadwick / Wayfair, LLC',
      license: 'CC BY 4.0',
      sourceUrl:
        'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa',
    },
  },
  sneaker: {
    id: 'sneaker',
    name: 'Sneaker',
    src: '/models/sneaker.glb',
    poster: '/images/posters/sneaker.webp',
    alt: 'Low-top sneaker with a textured upper and rubber sole',
    dimensions: '30 × 15 × 12 cm',
    variants: ['midnight', 'beach', 'street'],
    cameraOrbit: '-40deg 75deg auto',
    credit: {
      title: 'MaterialsVariantsShoe',
      author: 'Shopify',
      license: 'CC BY 4.0',
      sourceUrl:
        'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe',
      notes: 'Textures resized to 1024 px for faster mobile loading.',
    },
  },
};

/** Models offered in the AR Playground, in display order. */
export const playgroundModelIds: ModelId[] = ['chair', 'robot', 'car'];

