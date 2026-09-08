'use client';

import { useEffect, useState } from 'react';
import { Marker, type Map } from 'maplibre-gl';
import { Camera, Copy, ExternalLink, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  cameraReference,
  publicCameras,
  type PublicCamera,
} from '@/lib/public-cameras';

export function PublicCameraLayer({
  map,
  visible,
}: {
  map: Map | null;
  visible: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selected, setSelected] = useState<PublicCamera | null>(null);

  useEffect(() => {
    if (!map || !visible || !enabled) return;
    const markers = publicCameras.map((camera) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'atlas-camera-marker';
      button.textContent = '◉';
      button.setAttribute(
        'aria-label',
        `Câmera ${camera.name}, localização aproximada`,
      );
      button.title = `${camera.name} · localização aproximada`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelected(camera);
      });
      return new Marker({ element: button })
        .setLngLat(camera.coordinates)
        .addTo(map);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [map, visible, enabled]);

  if (!visible) return null;
  return (
    <>
      <div className="absolute left-3 top-17 z-20 flex overflow-hidden rounded-lg border border-[#dce2ed] bg-white shadow-lg md:left-4 md:top-18">
        <button
          type="button"
          aria-pressed={enabled}
          onClick={() => setEnabled(!enabled)}
          className={`flex min-h-11 items-center gap-2 px-3 text-xs font-semibold ${enabled ? 'bg-teal-800 text-white' : 'text-[#172235]'}`}
        >
          <Camera className="size-4" /> Câmeras
        </button>
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="min-h-11 border-l px-3 text-xs font-semibold text-[#172235]"
        >
          Ver fontes
        </button>
      </div>
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col overflow-y-auto sm:max-w-lg">
          <DialogTitle className="pr-8">Câmeras públicas</DialogTitle>
          <DialogDescription>
            Catálogo inicial: {publicCameras.length} ponto com transmissão
            conferida. A localização é aproximada. A ausência de um ponto não
            significa ausência de câmeras.
          </DialogDescription>
          {publicCameras.map((camera) => (
            <button
              key={camera.id}
              type="button"
              className="rounded-xl border p-4 text-left hover:bg-muted focus-visible:outline-2"
              onClick={() => {
                setEnabled(true);
                setCatalogOpen(false);
                setSelected(camera);
                map?.flyTo({
                  center: camera.coordinates,
                  zoom: 14,
                  duration: 0,
                });
              }}
            >
              <span className="block font-semibold">{camera.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {camera.operator} · imagem conferida em {camera.checkedAt}
              </span>
            </button>
          ))}
          <div className="space-y-3 border-t pt-4 text-sm">
            <h3 className="font-semibold">Consultar outros catálogos</h3>
            <p className="text-xs text-muted-foreground">
              Fontes ainda sem pontos validados neste mapa. A disponibilidade
              depende de cada serviço.
            </p>
            <SourceLink
              href="https://www.camerasrj.com.br/"
              title="CamerasRJ"
              note="Agregador independente. Os dois players testados em 08/09/2026 falharam; não guarda gravações."
            />
            <SourceLink
              href="https://www.skylinewebcams.com/en/webcam/brasil/rio-de-janeiro.html"
              title="SkylineWebcams"
              note="Catálogo de transmissões do Rio. Pode listar a mesma câmera de outro site."
            />
            <SourceLink
              href="https://cor.rio/centro-de-operacoes-e-resiliencia-da-prefeitura-do-rio-disponibiliza-nova-versao-do-aplicativo-cor-rio/"
              title="Aplicativo COR.Rio"
              note="O COR anuncia câmeras no aplicativo. Acesso no app ainda não testado por este projeto."
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && <CameraDetail key={selected.id} camera={selected} />}
      </Dialog>
    </>
  );
}

function SourceLink({
  href,
  title,
  note,
}: {
  href: string;
  title: string;
  note: string;
}) {
  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
      >
        {title}
        <ExternalLink className="size-3" />
      </a>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function CameraDetail({ camera }: { camera: PublicCamera }) {
  const [play, setPlay] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const reference = cameraReference(camera);
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopyStatus(
        'Referência copiada. Complete a data, o horário e o local do ocorrido.',
      );
    } catch {
      setCopyStatus(
        'Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.',
      );
    }
  }
  return (
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-y-auto sm:max-w-2xl">
      <DialogTitle className="pr-8">{camera.name}</DialogTitle>
      <DialogDescription>
        {camera.operator} · {camera.address}
      </DialogDescription>
      <div className="aspect-video shrink-0 overflow-hidden rounded-xl bg-[#172235] text-white">
        {play ? (
          <iframe
            className="h-full w-full"
            title={`Transmissão ${camera.name}`}
            src={`https://www.youtube-nocookie.com/embed/${camera.youtubeId}?autoplay=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
            type="button"
            onClick={() => setPlay(true)}
          >
            <Play className="size-8" />
            <span className="font-semibold">Abrir transmissão</span>
            <span className="text-xs text-white/70">
              Carrega o player do YouTube
            </span>
          </button>
        )}
      </div>
      <div className="space-y-2 text-xs leading-5 text-muted-foreground">
        <p>
          Imagem conferida em {camera.checkedAt}. Pode estar indisponível agora.
          A câmera muda de direção; o marcador não representa toda a área
          filmada.
        </p>
        <p>
          Localização aproximada, baseada em{' '}
          <a
            className="underline"
            href={camera.locationSource}
            target="_blank"
            rel="noopener noreferrer"
          >
            diretório de câmeras
          </a>
          . O endereço foi publicado pelo operador.
        </p>
        <a
          className="inline-flex items-center gap-1 font-semibold text-foreground underline"
          href={camera.source}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir no site do operador <ExternalLink className="size-3" />
        </a>
      </div>
      <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <h3 className="font-semibold">
          Precisa buscar imagens de um ocorrido?
        </h3>
        <p className="text-sm leading-6">
          Ao registrar a ocorrência, informe à polícia esta referência, a data,
          o horário aproximado e o local exato. A autoridade poderá avaliar se
          cabe solicitar imagens ao responsável.
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Uma câmera próxima não garante que o fato foi filmado ou que exista
          gravação. Este mapa não grava nem recupera imagens.
        </p>
        <Button
          variant="outline"
          className="h-auto min-h-11 whitespace-normal"
          onClick={() => setReferenceOpen(!referenceOpen)}
          aria-expanded={referenceOpen}
        >
          Levar referência à polícia
        </Button>
        {referenceOpen && (
          <div className="space-y-3">
            <label
              className="block text-xs font-medium"
              htmlFor="camera-reference"
            >
              Referência para copiar e completar
            </label>
            <textarea
              id="camera-reference"
              readOnly
              value={reference}
              rows={8}
              className="w-full resize-y rounded-lg border bg-white p-3 text-xs leading-5 text-[#172235]"
            />
            <Button onClick={copyReference}>
              <Copy className="size-4" /> Copiar referência
            </Button>
            <output className="block text-xs">
              {copyStatus}
            </output>
          </div>
        )}
        <details className="text-xs leading-5 text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            E as câmeras da Prefeitura?
          </summary>
          <p className="mt-2">
            A{' '}
            <a
              href="https://civitas.rio/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              CIVITAS informa
            </a>{' '}
            que solicitações são restritas às autoridades de segurança e ao
            sistema de Justiça, mediante ofício. O serviço de{' '}
            <a
              href="https://www.1746.rio/hc/pt-br/articles/10872730317339-Informa%C3%A7%C3%B5es-sobre-imagens-das-c%C3%A2meras-de-monitoramento"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              reserva de imagens do 1746
            </a>{' '}
            atende fatos cíveis ou administrativos e exclui roubos e furtos.
            Esta transmissão é de um operador privado.
          </p>
        </details>
      </section>
    </DialogContent>
  );
}
