import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * GLTFLoader with the meshopt decoder. Public models use EXT_meshopt_compression
 * (and WebP textures, which this three.js loader understands on its own).
 * Uncompressed glTFs still load; the decoder is only used when the file asks for it.
 */
export async function createGLTFLoader(): Promise<GLTFLoader> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

export async function loadGlb(url: string): Promise<GLTF> {
  const loader = await createGLTFLoader();
  return loader.loadAsync(url);
}
