/** The initial social preview pilot is intentionally limited to these IDs. */
export const CAMERA_SHARE_CARDS = {
  'camerasrj-1698': {
    image: '/share/camera-camerasrj-1698.png',
    alt: 'Câmera Alto da Boa Vista - Fixa, fonte CamerasRJ, no Alto da Boa Vista. Consulte a disponibilidade na fonte.',
  },
  'camerasrj-1725': {
    image: '/share/camera-camerasrj-1725.png',
    alt: 'Câmera Av. Édison Passos, 1011 - Fixa, fonte CamerasRJ, no Alto da Boa Vista. Consulte a disponibilidade na fonte.',
  },
} as const;

export function cameraShareCard(id: string) {
  return Object.hasOwn(CAMERA_SHARE_CARDS, id)
    ? CAMERA_SHARE_CARDS[id as keyof typeof CAMERA_SHARE_CARDS]
    : undefined;
}
