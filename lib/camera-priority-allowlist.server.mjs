export const cameraPriorityAllowlist = [
  { id: 'homes-posto-3', source: 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam', publisher: 'Homes in Rio', operator: 'Homes in Rio', permission: 'unknown', adapter: 'youtube' },
  { id: 'homes-posto-6', source: 'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam', publisher: 'Homes in Rio', operator: 'Homes in Rio', permission: 'unknown', adapter: 'youtube' },
  { id: 'camerasrj-1698', source: 'https://www.camerasrj.com.br/?bairro=Alto+da+Boa+Vista&camera=1698', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-373', source: 'https://www.camerasrj.com.br/?bairro=Aboli%C3%A7%C3%A3o&camera=373', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-1725', source: 'https://www.camerasrj.com.br/?bairro=Alto+da+Boa+Vista&camera=1725', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-7964', source: 'https://www.camerasrj.com.br/?bairro=Alto+da+Boa+Vista&camera=7964', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-1555', source: 'https://www.camerasrj.com.br/?bairro=Vila+Militar&camera=1555', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-7328', source: 'https://www.camerasrj.com.br/?bairro=Vila+Valqueire&camera=7328', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-6170', source: 'https://www.camerasrj.com.br/?bairro=Vila+Isabel&camera=6170', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
  { id: 'camerasrj-354', source: 'https://www.camerasrj.com.br/?bairro=Vila+Isabel&camera=354', publisher: 'CamerasRJ', operator: 'unknown', permission: 'unknown', adapter: 'camerasrj' },
];

export const cameraPriorityAllowlistMap = new Map(
  cameraPriorityAllowlist.map((record) => [record.id, record]),
);
